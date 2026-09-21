import { randomUUID } from 'node:crypto';

import type { Client } from 'pg';

import { connectAs, connectAsPostgres, createFixture, expectDenied, type Fixture } from './helpers';

/**
 * Los avisos son personales y las fotos son del hogar. Esto lo comprueba
 * contra Postgres real, no contra una idea de cómo deberían funcionar.
 */

let admin: Client;
let fixture: Fixture;

beforeAll(async () => {
  admin = await connectAsPostgres();
  fixture = await createFixture(admin);
});

afterAll(async () => {
  await admin.end();
});

describe('recordatorios · cada cuidador ve los suyos', () => {
  it('una persona crea su recordatorio y lo ve', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const { rows } = await owner.query<{ id: string }>(
        `insert into public.reminders
           (household_id, baby_id, profile_id, category, title, scheduled_for, created_by)
         values ($1, $2, $3, 'symptom_followup', 'Revisar la erupción', now() + interval '1 hour', $3)
         returning id`,
        [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
      );
      expect(rows).toHaveLength(1);

      const propios = await owner.query(`select id from public.reminders`);
      expect(propios.rows).toHaveLength(1);
    } finally {
      await owner.end();
    }
  });

  it('otro cuidador del mismo hogar no ve ese recordatorio', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const { rows } = await caregiver.query(`select id from public.reminders`);
      expect(rows).toHaveLength(0);
    } finally {
      await caregiver.end();
    }
  });

  it('nadie puede crear un recordatorio a nombre de otra persona', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const error = await expectDenied(
        caregiver.query(
          `insert into public.reminders
             (household_id, profile_id, category, title, scheduled_for)
           values ($1, $2, 'feeding', 'Toma', now() + interval '2 hours')`,
          [fixture.householdId, fixture.users.owner.profileId],
        ),
      );
      expect(error.message).toMatch(/row-level security/i);
    } finally {
      await caregiver.end();
    }
  });

  it('el profesional de solo lectura no puede crear recordatorios', async () => {
    const professional = await connectAs(fixture.users.professional.authUserId);

    try {
      const error = await expectDenied(
        professional.query(
          `insert into public.reminders
             (household_id, profile_id, category, title, scheduled_for)
           values ($1, $2, 'feeding', 'Toma', now() + interval '2 hours')`,
          [fixture.householdId, fixture.users.professional.profileId],
        ),
      );
      expect(error.message).toMatch(/row-level security/i);
    } finally {
      await professional.end();
    }
  });
});

describe('preferencias de aviso · son de cada persona', () => {
  it('una persona guarda las suyas y no ve las de otra', async () => {
    await admin.query(
      `insert into public.notification_preferences (profile_id, household_id, category, enabled)
       values ($1, $2, 'daily_summary', false)`,
      [fixture.users.owner.profileId, fixture.householdId],
    );

    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      await caregiver.query(
        `insert into public.notification_preferences (profile_id, household_id, category, enabled)
         values ($1, $2, 'daily_summary', true)`,
        [fixture.users.caregiver.profileId, fixture.householdId],
      );

      const { rows } = await caregiver.query<{ profile_id: string; enabled: boolean }>(
        `select profile_id, enabled from public.notification_preferences`,
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.profile_id).toBe(fixture.users.caregiver.profileId);
      expect(rows[0]?.enabled).toBe(true);
    } finally {
      await caregiver.end();
    }
  });
});

describe('fotos · pertenecen al hogar, no a internet', () => {
  it('la ruta de una foto tiene que empezar por el id del hogar', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const error = await expectDenied(
        owner.query(
          `insert into public.media_assets
             (household_id, entity_type, entity_id, storage_path, media_type, created_by)
           values ($1, 'symptom', $2, 'otro-hogar/symptom/x/foto.jpg', 'photo', $3)`,
          [fixture.householdId, randomUUID(), fixture.users.owner.profileId],
        ),
      );
      expect(error.message).toMatch(/media_assets_path_scoped_to_household|violates check/i);
    } finally {
      await owner.end();
    }
  });

  it('una persona ajena no ve las fotos del hogar', async () => {
    const entityId = randomUUID();
    await admin.query(
      `insert into public.media_assets
         (household_id, entity_type, entity_id, storage_path, media_type, created_by)
       values ($1, 'symptom', $2, $3, 'photo', $4)`,
      [
        fixture.householdId,
        entityId,
        `${fixture.householdId}/symptom/${entityId}/foto.jpg`,
        fixture.users.owner.profileId,
      ],
    );

    const stranger = await connectAs(fixture.users.stranger.authUserId);

    try {
      const { rows } = await stranger.query(`select id from public.media_assets`);
      expect(rows).toHaveLength(0);
    } finally {
      await stranger.end();
    }
  });

  it('el cuidador puede adjuntar una foto a lo que registra', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);
    const entityId = randomUUID();

    try {
      const { rows } = await caregiver.query<{ id: string }>(
        `insert into public.media_assets
           (household_id, entity_type, entity_id, storage_path, media_type, category, created_by)
         values ($1, 'diaper_event', $2, $3, 'photo', 'diaper', $4)
         returning id`,
        [
          fixture.householdId,
          entityId,
          `${fixture.householdId}/diaper_event/${entityId}/foto.jpg`,
          fixture.users.caregiver.profileId,
        ],
      );
      expect(rows).toHaveLength(1);
    } finally {
      await caregiver.end();
    }
  });

  it('el borrado de una foto es lógico: la fila no desaparece', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);
    const entityId = randomUUID();

    try {
      const { rows } = await owner.query<{ id: string }>(
        `insert into public.media_assets
           (household_id, entity_type, entity_id, storage_path, media_type, created_by)
         values ($1, 'reaction_episode', $2, $3, 'photo', $4)
         returning id`,
        [
          fixture.householdId,
          entityId,
          `${fixture.householdId}/reaction_episode/${entityId}/foto.jpg`,
          fixture.users.owner.profileId,
        ],
      );
      const mediaId = rows[0]?.id as string;

      await owner.query(`update public.media_assets set deleted_at = now() where id = $1`, [
        mediaId,
      ]);

      const visibles = await owner.query(
        `select id from public.media_assets where id = $1 and deleted_at is null`,
        [mediaId],
      );
      expect(visibles.rows).toHaveLength(0);

      const almacenadas = await admin.query(
        `select deleted_at from public.media_assets where id = $1`,
        [mediaId],
      );
      expect(almacenadas.rows[0]?.deleted_at).not.toBeNull();
    } finally {
      await owner.end();
    }
  });
});

describe('detalle de deposición', () => {
  it('acepta el detalle ampliado y lo guarda tal cual', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const { rows } = await caregiver.query<{
        stool_amount: string;
        visible_food_residue: boolean;
        straining: boolean;
      }>(
        `insert into public.diaper_events
           (household_id, baby_id, occurred_at, diaper_type, stool_amount,
            visible_food_residue, straining, unusual_odor, created_by)
         values ($1, $2, now(), 'stool', 'moderate', true, true, false, $3)
         returning stool_amount, visible_food_residue, straining`,
        [fixture.householdId, fixture.babyId, fixture.users.caregiver.profileId],
      );

      expect(rows[0]).toMatchObject({
        stool_amount: 'moderate',
        visible_food_residue: true,
        straining: true,
      });
    } finally {
      await caregiver.end();
    }
  });
});
