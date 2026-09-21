import { randomUUID } from 'node:crypto';

import type { Client } from 'pg';

import { connectAs, connectAsPostgres, createFixture, expectDenied, type Fixture } from './helpers';

/**
 * Reglas de dominio comprobadas contra la base real (§23, pruebas 7-12).
 *
 * Estas pruebas defienden decisiones de producto, no solo el esquema: un
 * síntoma vive solo, un episodio agrupa varios, una relación con exposiciones
 * no implica causa, el borrado es lógico y los contadores los mantiene la base.
 */

let admin: Client;
let owner: Client;
let fixture: Fixture;

beforeAll(async () => {
  admin = await connectAsPostgres();
  fixture = await createFixture(admin);
  owner = await connectAs(fixture.users.owner.authUserId);
});

afterAll(async () => {
  await owner.end();
  await admin.end();
});

describe('7 · un síntoma existe sin ninguna exposición', () => {
  it('se guarda solo, sin alimento ni episodio', async () => {
    const { rows } = await owner.query(
      `insert into public.symptoms (household_id, baby_id, symptom_type, started_at, created_by)
       values ($1, $2, 'irritability', now() - interval '2 hours', $3)
       returning id`,
      [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
    );

    expect(rows).toHaveLength(1);

    // La tabla de síntomas no tiene ninguna columna de alimento sospechoso.
    const { rows: columns } = await admin.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'symptoms'`,
    );
    const names = columns.map((column) => column.column_name);
    expect(names).not.toContain('food_id');
    expect(names).not.toContain('suspected_food_id');
  });
});

describe('8 · un episodio agrupa varios síntomas', () => {
  it('relaciona dos síntomas con el mismo episodio', async () => {
    const first = await owner.query<{ id: string }>(
      `insert into public.symptoms (household_id, baby_id, symptom_type, started_at, created_by)
       values ($1, $2, 'skin_rash', now() - interval '3 hours', $3) returning id`,
      [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
    );
    const second = await owner.query<{ id: string }>(
      `insert into public.symptoms (household_id, baby_id, symptom_type, started_at, created_by)
       values ($1, $2, 'vomiting', now() - interval '2 hours', $3) returning id`,
      [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
    );

    const episode = await owner.query<{ id: string }>(
      `insert into public.reaction_episodes (household_id, baby_id, started_at, created_by)
       values ($1, $2, now() - interval '3 hours', $3) returning id`,
      [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
    );

    const episodeId = episode.rows[0]?.id as string;

    await owner.query(
      `insert into public.episode_symptoms (episode_id, symptom_id)
       values ($1::uuid, $2::uuid), ($1::uuid, $3::uuid)`,
      [episodeId, first.rows[0]?.id, second.rows[0]?.id],
    );

    const { rows } = await owner.query<{ count: string }>(
      `select count(*)::text as count from public.episode_symptoms where episode_id = $1`,
      [episodeId],
    );

    expect(rows[0]?.count).toBe('2');
  });
});

describe('9 · un episodio se relaciona con varias exposiciones sin marcar causa', () => {
  it('guarda relación y etiqueta descriptiva, nunca una causa', async () => {
    const episode = await owner.query<{ id: string }>(
      `insert into public.reaction_episodes (household_id, baby_id, started_at, created_by)
       values ($1, $2, now(), $3) returning id`,
      [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
    );
    const episodeId = episode.rows[0]?.id as string;

    const exposureIds: string[] = [];
    for (const key of ['hen_egg', 'cow_milk'] as const) {
      const exposure = await owner.query<{ id: string }>(
        `insert into public.exposures
           (household_id, baby_id, source_type, source_id, food_id, occurred_at)
         values ($1, $2, 'baby_food', $3, $4, now() - interval '4 hours')
         returning id`,
        [fixture.householdId, fixture.babyId, randomUUID(), fixture.foodIds[key]],
      );
      exposureIds.push(exposure.rows[0]?.id as string);
    }

    for (const exposureId of exposureIds) {
      await owner.query(
        `insert into public.episode_exposures
           (episode_id, exposure_id, relation_type, confidence_label)
         values ($1, $2, 'temporal_candidate', 'insufficient_data')`,
        [episodeId, exposureId],
      );
    }

    const { rows } = await owner.query(
      `select relation_type, confidence_label from public.episode_exposures where episode_id = $1`,
      [episodeId],
    );

    expect(rows).toHaveLength(2);
    // Ninguna exposición queda señalada como "la causa".
    for (const row of rows) {
      expect(row.relation_type).toBe('temporal_candidate');
      expect(row.confidence_label).toBe('insufficient_data');
    }

    const { rows: columns } = await admin.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'episode_exposures'`,
    );
    const names = columns.map((column) => column.column_name);
    expect(names).not.toContain('is_cause');
    expect(names).not.toContain('causality');
    expect(names).not.toContain('risk_score');
  });
});

describe('10 · los eventos en diferido se ordenan por occurred_at', () => {
  it('la línea de tiempo coloca un registro retroactivo en su lugar real', async () => {
    const babyId = randomUUID();
    await admin.query(
      `insert into public.babies (id, household_id, name, created_by)
       values ($1, $2, 'Bebé línea de tiempo', $3)`,
      [babyId, fixture.householdId, fixture.users.owner.profileId],
    );

    // Se registra primero el evento más reciente…
    await owner.query(
      `insert into public.symptoms (household_id, baby_id, symptom_type, started_at, created_by)
       values ($1, $2, 'cough', timestamptz '2026-03-02 20:00:00+00', $3)`,
      [fixture.householdId, babyId, fixture.users.owner.profileId],
    );
    // …y después, en diferido, uno que ocurrió antes.
    await owner.query(
      `insert into public.diaper_events (household_id, baby_id, occurred_at, diaper_type, created_by)
       values ($1, $2, timestamptz '2026-03-02 08:00:00+00', 'stool', $3)`,
      [fixture.householdId, babyId, fixture.users.owner.profileId],
    );

    const { rows } = await owner.query<{ type: string; occurred_at: Date; created_at: Date }>(
      `select t.type, t.occurred_at, e.created_at
       from public.timeline_events t
       left join public.symptoms e on e.id = t.id
       where t.baby_id = $1
       order by t.occurred_at asc`,
      [babyId],
    );

    expect(rows.map((row) => row.type)).toEqual(['diaper_event', 'symptom']);
  });
});

describe('11 · borrar un evento de salud es un borrado lógico', () => {
  it('marca deleted_at y desaparece de la línea de tiempo sin perder la fila', async () => {
    const inserted = await owner.query<{ id: string }>(
      `insert into public.symptoms (household_id, baby_id, symptom_type, started_at, created_by)
       values ($1, $2, 'diarrhea', now(), $3) returning id`,
      [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
    );
    const symptomId = inserted.rows[0]?.id as string;

    await owner.query(`update public.symptoms set deleted_at = now() where id = $1`, [symptomId]);

    const { rows: timeline } = await owner.query(
      `select id from public.timeline_events where id = $1`,
      [symptomId],
    );
    expect(timeline).toHaveLength(0);

    // La fila sigue existiendo: el historial clínico no se destruye.
    const { rows: stored } = await admin.query(
      `select deleted_at from public.symptoms where id = $1`,
      [symptomId],
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]?.deleted_at).not.toBeNull();
  });
});

describe('12 · el estado de alimento cuenta exposiciones correctamente', () => {
  it('la base mantiene contador y fechas al registrar exposiciones', async () => {
    const babyId = randomUUID();
    await admin.query(
      `insert into public.babies (id, household_id, name, created_by)
       values ($1, $2, 'Bebé contador', $3)`,
      [babyId, fixture.householdId, fixture.users.owner.profileId],
    );

    const foodId = fixture.foodIds.rice;
    const times = [
      '2026-03-01 09:00:00+00',
      '2026-03-03 09:00:00+00',
      '2026-03-02 09:00:00+00', // registrado en diferido, entre los dos anteriores
    ];

    for (const occurredAt of times) {
      await owner.query(
        `insert into public.exposures
           (household_id, baby_id, source_type, source_id, food_id, occurred_at)
         values ($1, $2, 'baby_food', $3, $4, $5::timestamptz)`,
        [fixture.householdId, babyId, randomUUID(), foodId, occurredAt],
      );
    }

    const { rows } = await owner.query<{
      exposure_count: number;
      first_exposure_at: Date;
      last_exposure_at: Date;
      status: string;
      status_source: string;
    }>(
      `select exposure_count, first_exposure_at, last_exposure_at, status, status_source
       from public.baby_food_status where baby_id = $1 and food_id = $2`,
      [babyId, foodId],
    );

    const row = rows[0];
    expect(row?.exposure_count).toBe(3);
    expect(row?.first_exposure_at.toISOString()).toBe('2026-03-01T09:00:00.000Z');
    expect(row?.last_exposure_at.toISOString()).toBe('2026-03-03T09:00:00.000Z');
    // El sistema cuenta, pero no decide el estado.
    expect(row?.status).toBe('unknown');
  });

  it('la base impide que un resumen automático declare "evitar"', async () => {
    const error = await expectDenied(
      admin.query(
        `insert into public.baby_food_status (baby_id, food_id, status, status_source)
         values ($1, $2, 'avoid', 'system_summary')`,
        [fixture.babyId, fixture.foodIds.hen_egg],
      ),
    );

    expect(error.message).toMatch(/no puede establecer/i);
  });
});
