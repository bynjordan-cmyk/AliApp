import type { Client } from 'pg';

import {
  connectAs,
  connectAsAnonymousUser,
  connectAsPostgres,
  createFixture,
  expectDenied,
  type Fixture,
} from './helpers';

/**
 * Pruebas de Row Level Security contra Postgres real (§23, pruebas 1-6).
 *
 * Se ejecutan con `npm run test:rls` sobre la base que levanta
 * `npm run db:start`. No hay simulacros: son las políticas de verdad.
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

describe('1 · una persona ajena no ve los datos del hogar', () => {
  it('no lee el hogar, ni el bebé, ni los eventos', async () => {
    const stranger = await connectAs(fixture.users.stranger.authUserId);

    try {
      const households = await stranger.query(`select * from public.households where id = $1`, [
        fixture.householdId,
      ]);
      const babies = await stranger.query(`select * from public.babies where id = $1`, [
        fixture.babyId,
      ]);
      const symptoms = await stranger.query(`select * from public.symptoms where household_id = $1`, [
        fixture.householdId,
      ]);

      expect(households.rows).toHaveLength(0);
      expect(babies.rows).toHaveLength(0);
      expect(symptoms.rows).toHaveLength(0);
    } finally {
      await stranger.end();
    }
  });

  it('tampoco puede escribir en el hogar', async () => {
    const stranger = await connectAs(fixture.users.stranger.authUserId);

    try {
      const error = await expectDenied(
        stranger.query(
          `insert into public.symptoms (household_id, baby_id, symptom_type, started_at, created_by)
           values ($1, $2, 'skin_rash', now(), $3)`,
          [fixture.householdId, fixture.babyId, fixture.users.stranger.profileId],
        ),
      );
      expect(error.message).toMatch(/row-level security|violates/i);
    } finally {
      await stranger.end();
    }
  });

  it('una sesión sin membresía no encuentra nada', async () => {
    const anonymous = await connectAsAnonymousUser();

    try {
      const { rows } = await anonymous.query(`select * from public.babies`);
      expect(rows).toHaveLength(0);
    } finally {
      await anonymous.end();
    }
  });
});

describe('2 · madre/padre lee y escribe en su hogar', () => {
  it('crea un bebé, una comida y un síntoma', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const babies = await owner.query(`select * from public.babies where id = $1`, [
        fixture.babyId,
      ]);
      expect(babies.rows).toHaveLength(1);

      const entry = await owner.query(
        `insert into public.food_entries
           (household_id, subject_type, baby_id, occurred_at, created_by)
         values ($1, 'baby', $2, now(), $3)
         returning id`,
        [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
      );
      expect(entry.rows).toHaveLength(1);

      const symptom = await owner.query(
        `insert into public.symptoms
           (household_id, baby_id, symptom_type, started_at, severity, created_by)
         values ($1, $2, 'skin_rash', now(), 2, $3)
         returning id`,
        [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
      );
      expect(symptom.rows).toHaveLength(1);
    } finally {
      await owner.end();
    }
  });

  it('gestiona la membresía del hogar', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const result = await owner.query(
        `update public.household_members set role = 'caregiver'
         where household_id = $1 and profile_id = $2
         returning role`,
        [fixture.householdId, fixture.users.caregiver.profileId],
      );
      expect(result.rows).toHaveLength(1);
    } finally {
      await owner.end();
    }
  });
});

describe('3 · el cuidador crea eventos de rutina', () => {
  it('registra un pañal y una toma', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const diaper = await caregiver.query(
        `insert into public.diaper_events
           (household_id, baby_id, occurred_at, diaper_type, created_by)
         values ($1, $2, now(), 'stool', $3)
         returning id`,
        [fixture.householdId, fixture.babyId, fixture.users.caregiver.profileId],
      );
      expect(diaper.rows).toHaveLength(1);

      const breastfeed = await caregiver.query(
        `insert into public.breastfeeds (household_id, baby_id, started_at, created_by)
         values ($1, $2, now(), $3)
         returning id`,
        [fixture.householdId, fixture.babyId, fixture.users.caregiver.profileId],
      );
      expect(breastfeed.rows).toHaveLength(1);
    } finally {
      await caregiver.end();
    }
  });

  it('no puede registrar eventos a nombre de otra persona', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const error = await expectDenied(
        caregiver.query(
          `insert into public.diaper_events
             (household_id, baby_id, occurred_at, diaper_type, created_by)
           values ($1, $2, now(), 'urine', $3)`,
          [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
        ),
      );
      expect(error.message).toMatch(/row-level security/i);
    } finally {
      await caregiver.end();
    }
  });

  it('lee el estado de los alimentos, que es lo que necesita para no ofrecer algo', async () => {
    await admin.query(
      `insert into public.baby_food_status (baby_id, food_id, status, status_source, status_updated_by)
       values ($1, $2, 'avoid', 'family', $3)
       on conflict (baby_id, food_id) do update set status = 'avoid'`,
      [fixture.babyId, fixture.foodIds.cow_milk, fixture.users.owner.profileId],
    );

    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const { rows } = await caregiver.query(
        `select status from public.baby_food_status where baby_id = $1 and food_id = $2`,
        [fixture.babyId, fixture.foodIds.cow_milk],
      );
      expect(rows[0]?.status).toBe('avoid');
    } finally {
      await caregiver.end();
    }
  });
});

describe('4 · el cuidador no toca los estados de alergia', () => {
  it('no puede marcar ni quitar un "evitar"', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const updated = await caregiver.query(
        `update public.baby_food_status set status = 'tolerated'
         where baby_id = $1 and food_id = $2
         returning food_id`,
        [fixture.babyId, fixture.foodIds.cow_milk],
      );
      // La política filtra la fila: la actualización no afecta a nada.
      expect(updated.rowCount).toBe(0);

      const inserted = await expectDenied(
        caregiver.query(
          `insert into public.baby_food_status (baby_id, food_id, status, status_source)
           values ($1, $2, 'avoid', 'family')`,
          [fixture.babyId, fixture.foodIds.hen_egg],
        ),
      );
      expect(inserted.message).toMatch(/row-level security/i);
    } finally {
      await caregiver.end();
    }
  });

  it('no puede cambiar roles del hogar', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const result = await caregiver.query(
        `update public.household_members set role = 'owner'
         where household_id = $1 and profile_id = $2
         returning role`,
        [fixture.householdId, fixture.users.caregiver.profileId],
      );
      expect(result.rowCount).toBe(0);
    } finally {
      await caregiver.end();
    }
  });

  it('no puede borrar físicamente historial clínico', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);
    const { rows } = await owner.query(
      `insert into public.symptoms (household_id, baby_id, symptom_type, started_at, created_by)
       values ($1, $2, 'vomiting', now(), $3) returning id`,
      [fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
    );
    await owner.end();

    const symptomId = rows[0]?.id as string;
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const deleted = await caregiver.query(`delete from public.symptoms where id = $1`, [
        symptomId,
      ]);
      expect(deleted.rowCount).toBe(0);

      const { rows: stillThere } = await caregiver.query(
        `select id from public.symptoms where id = $1`,
        [symptomId],
      );
      expect(stillThere).toHaveLength(1);
    } finally {
      await caregiver.end();
    }
  });
});

describe('5 · un miembro revocado pierde el acceso', () => {
  it('no lee nada y no escribe nada', async () => {
    const revoked = await connectAs(fixture.users.revoked.authUserId);

    try {
      const { rows } = await revoked.query(`select * from public.babies where id = $1`, [
        fixture.babyId,
      ]);
      expect(rows).toHaveLength(0);

      const error = await expectDenied(
        revoked.query(
          `insert into public.diaper_events
             (household_id, baby_id, occurred_at, diaper_type, created_by)
           values ($1, $2, now(), 'urine', $3)`,
          [fixture.householdId, fixture.babyId, fixture.users.revoked.profileId],
        ),
      );
      expect(error.message).toMatch(/row-level security/i);
    } finally {
      await revoked.end();
    }
  });
});

describe('6 · el profesional solo lee', () => {
  it('ve los datos del hogar mientras su acceso está activo', async () => {
    const professional = await connectAs(fixture.users.professional.authUserId);

    try {
      const { rows } = await professional.query(`select * from public.babies where id = $1`, [
        fixture.babyId,
      ]);
      expect(rows).toHaveLength(1);
    } finally {
      await professional.end();
    }
  });

  it('no puede crear ni modificar eventos de la familia', async () => {
    const professional = await connectAs(fixture.users.professional.authUserId);

    try {
      const insertError = await expectDenied(
        professional.query(
          `insert into public.symptoms
             (household_id, baby_id, symptom_type, started_at, created_by)
           values ($1, $2, 'cough', now(), $3)`,
          [fixture.householdId, fixture.babyId, fixture.users.professional.profileId],
        ),
      );
      expect(insertError.message).toMatch(/row-level security/i);

      const updated = await professional.query(
        `update public.symptoms set notes = 'editado por el profesional'
         where household_id = $1
         returning id`,
        [fixture.householdId],
      );
      expect(updated.rowCount).toBe(0);
    } finally {
      await professional.end();
    }
  });
});
