import { randomUUID } from 'node:crypto';

import type { Client } from 'pg';

import { connectAs, connectAsPostgres } from './helpers';

/**
 * Corte vertical completo (§26, fase G), comprobado contra la base real:
 *
 *   entra una madre → crea hogar → tiene bebé → registra una comida
 *   → registra un síntoma POR SEPARADO → ambos salen en la línea de tiempo
 *   → agrupa el síntoma en un episodio → el episodio se relaciona con la
 *     exposición sin afirmar causa → RLS sigue protegiendo el hogar.
 */

let admin: Client;

beforeAll(async () => {
  admin = await connectAsPostgres();
});

afterAll(async () => {
  await admin.end();
});

describe('flujo completo de una madre', () => {
  it('registra, consulta y agrupa sin que nadie ajeno vea nada', async () => {
    // 1 · La madre se registra: el trigger de auth crea su perfil.
    const authUserId = randomUUID();
    await admin.query(
      `insert into auth.users (id, email, raw_user_meta_data)
       values ($1, $2, jsonb_build_object('display_name', $3::text, 'locale', 'es'))`,
      [authUserId, `slice-${authUserId}@aliapp.test`, 'Lucía'],
    );

    const mother = await connectAs(authUserId);

    try {
      const { rows: profiles } = await mother.query<{ id: string }>(
        `select id from public.profiles where auth_user_id = $1`,
        [authUserId],
      );
      const profileId = profiles[0]?.id as string;
      expect(profileId).toBeTruthy();

      // 2 · Crea su hogar con el RPC (único camino, queda como responsable).
      const { rows: households } = await mother.query<{ id: string }>(
        `select id from public.create_household('Familia del corte vertical', 'es')`,
      );
      const householdId = households[0]?.id as string;
      expect(householdId).toBeTruthy();

      const { rows: role } = await mother.query<{ role: string; status: string }>(
        `select role, status from public.household_members
         where household_id = $1 and profile_id = $2`,
        [householdId, profileId],
      );
      expect(role[0]).toMatchObject({ role: 'owner', status: 'active' });

      // 3 · Crea a su bebé.
      const { rows: babies } = await mother.query<{ id: string }>(
        `insert into public.babies (household_id, name, birth_date, created_by)
         values ($1, 'Ali', current_date - interval '9 months', $2)
         returning id`,
        [householdId, profileId],
      );
      const babyId = babies[0]?.id as string;

      // 4 · Registra una comida del bebé con su alimento y su exposición.
      const { rows: foods } = await mother.query<{ id: string }>(
        `select id from public.foods where canonical_key = 'hen_egg'`,
      );
      const foodId = foods[0]?.id as string;

      const mealAt = '2026-03-04 09:00:00+00';
      const { rows: entries } = await mother.query<{ id: string }>(
        `insert into public.food_entries
           (household_id, subject_type, baby_id, occurred_at, meal_type, created_by)
         values ($1, 'baby', $2, $3::timestamptz, 'breakfast', $4)
         returning id`,
        [householdId, babyId, mealAt, profileId],
      );
      const entryId = entries[0]?.id as string;

      await mother.query(
        `insert into public.food_entry_items (food_entry_id, food_id, is_first_exposure)
         values ($1, $2, true)`,
        [entryId, foodId],
      );

      const { rows: exposures } = await mother.query<{ id: string }>(
        `insert into public.exposures
           (household_id, baby_id, source_type, source_id, food_id, occurred_at)
         values ($1, $2, 'baby_food', $3, $4, $5::timestamptz)
         returning id`,
        [householdId, babyId, entryId, foodId, mealAt],
      );
      const exposureId = exposures[0]?.id as string;

      // 5 · Registra un síntoma POR SEPARADO, sin señalar ningún alimento.
      const symptomAt = '2026-03-04 12:30:00+00';
      const { rows: symptoms } = await mother.query<{ id: string }>(
        `insert into public.symptoms
           (household_id, baby_id, symptom_type, started_at, severity, created_by)
         values ($1, $2, 'skin_rash', $3::timestamptz, 2, $4)
         returning id`,
        [householdId, babyId, symptomAt, profileId],
      );
      const symptomId = symptoms[0]?.id as string;

      // 6 · Ambos aparecen en la línea de tiempo, ordenados por occurred_at.
      const { rows: timeline } = await mother.query<{ type: string; occurred_at: Date }>(
        `select type, occurred_at from public.timeline_events
         where baby_id = $1 order by occurred_at asc`,
        [babyId],
      );
      expect(timeline.map((row) => row.type)).toEqual(['food_entry', 'symptom']);

      // 7 · Agrupa el síntoma en un episodio y lo relaciona con la exposición.
      const { rows: episodes } = await mother.query<{ id: string }>(
        `insert into public.reaction_episodes (household_id, baby_id, started_at, created_by)
         values ($1, $2, $3::timestamptz, $4) returning id`,
        [householdId, babyId, symptomAt, profileId],
      );
      const episodeId = episodes[0]?.id as string;

      await mother.query(
        `insert into public.episode_symptoms (episode_id, symptom_id) values ($1, $2)`,
        [episodeId, symptomId],
      );
      await mother.query(
        `insert into public.episode_exposures
           (episode_id, exposure_id, relation_type, confidence_label)
         values ($1, $2, 'temporal_candidate', 'insufficient_data')`,
        [episodeId, exposureId],
      );

      // 8 · El informe del periodo devuelve hechos, sin conclusiones.
      const { rows: report } = await mother.query<{ build_report: Record<string, unknown> }>(
        `select public.build_report($1, timestamptz '2026-03-04 00:00:00+00',
                                        timestamptz '2026-03-05 00:00:00+00')`,
        [babyId],
      );
      const snapshot = report[0]?.build_report as Record<string, unknown>;
      expect(Array.isArray(snapshot.timeline)).toBe(true);
      expect((snapshot.timeline as unknown[]).length).toBe(3);
      expect((snapshot.exposures as unknown[]).length).toBe(1);
      expect((snapshot.episodes as unknown[]).length).toBe(1);

      // 9 · El contador de exposiciones se mantiene solo; el estado, no.
      const { rows: status } = await mother.query<{ exposure_count: number; status: string }>(
        `select exposure_count, status from public.baby_food_status
         where baby_id = $1 and food_id = $2`,
        [babyId, foodId],
      );
      expect(status[0]?.exposure_count).toBe(1);
      expect(status[0]?.status).toBe('unknown');

      // 10 · RLS: una persona ajena no ve nada de este hogar.
      const strangerAuthId = randomUUID();
      await admin.query(
        `insert into auth.users (id, email, raw_user_meta_data)
         values ($1, $2, '{}'::jsonb)`,
        [strangerAuthId, `stranger-${strangerAuthId}@aliapp.test`],
      );

      const stranger = await connectAs(strangerAuthId);
      try {
        const { rows: leaked } = await stranger.query(
          `select id from public.timeline_events where baby_id = $1`,
          [babyId],
        );
        expect(leaked).toHaveLength(0);
      } finally {
        await stranger.end();
      }
    } finally {
      await mother.end();
    }
  });
});
