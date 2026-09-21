import { randomUUID } from 'node:crypto';

import type { Client } from 'pg';

import { connectAs, connectAsPostgres, createFixture, expectDenied, type Fixture } from './helpers';

/**
 * Editar lo registrado, contra Postgres de verdad.
 *
 * Aquí se comprueban las tres promesas que hace el producto:
 *   1. se puede corregir todo, incluida la hora en que ocurrió,
 *   2. `created_at` y `created_by` no se tocan nunca,
 *   3. cada corrección deja constancia, la escriba quien la escriba.
 *
 * Y la frontera de siempre: quién puede editar qué lo decide la base, no la
 * interfaz.
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

type Fila = {
  id: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  created_by: string | null;
};

async function crearSintoma(cliente: Client, createdBy: string, startedAt = 'now()') {
  const { rows } = await cliente.query<Fila>(
    `insert into public.symptoms
       (id, household_id, baby_id, symptom_type, started_at, created_by)
     values ($1, $2, $3, 'skin_rash', ${startedAt}, $4)
     returning id, created_at, updated_at, edited_at, created_by`,
    [randomUUID(), fixture.householdId, fixture.babyId, createdBy],
  );

  const fila = rows[0];
  if (!fila) throw new Error('No se pudo crear el síntoma de prueba');
  return fila;
}

describe('corregir la hora de un registro', () => {
  it('occurred_at se puede mover al pasado sin tocar created_at', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const original = await crearSintoma(owner, fixture.users.owner.profileId);

      const { rows } = await owner.query<Fila>(
        `update public.symptoms
         set started_at = now() - interval '3 hours'
         where id = $1
         returning id, created_at, updated_at, edited_at, created_by`,
        [original.id],
      );

      const corregido = rows[0];
      expect(corregido).toBeDefined();
      // La historia se reordena; el momento del registro no se falsea.
      expect(corregido?.created_at).toEqual(original.created_at);
      expect(corregido?.created_by).toBe(original.created_by);
      expect(new Date(corregido?.updated_at as string).getTime()).toBeGreaterThanOrEqual(
        new Date(original.updated_at).getTime(),
      );
      expect(corregido?.edited_at).not.toBeNull();
    } finally {
      await owner.end();
    }
  });

  it('un pañal se puede completar después sin perder la hora original', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const { rows: creado } = await owner.query<{ id: string; occurred_at: string }>(
        `insert into public.diaper_events
           (id, household_id, baby_id, occurred_at, diaper_type, created_by)
         values ($1, $2, $3, now() - interval '5 hours', 'stool', $4)
         returning id, occurred_at`,
        [randomUUID(), fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
      );

      const pañal = creado[0];
      expect(pañal).toBeDefined();

      const { rows } = await owner.query<{ occurred_at: string; stool_color: string | null }>(
        `update public.diaper_events
         set stool_color = 'verdoso', stool_amount = 'moderate'
         where id = $1
         returning occurred_at, stool_color`,
        [pañal?.id],
      );

      expect(rows[0]?.stool_color).toBe('verdoso');
      expect(rows[0]?.occurred_at).toEqual(pañal?.occurred_at);
    } finally {
      await owner.end();
    }
  });

  it('una toma se cierra después y admite cantidad y marca', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const { rows: creado } = await owner.query<{ id: string }>(
        `insert into public.breastfeeds
           (id, household_id, baby_id, started_at, feed_kind, created_by)
         values ($1, $2, $3, now() - interval '30 minutes', 'formula', $4)
         returning id`,
        [randomUUID(), fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
      );

      const { rows } = await owner.query<{ ended_at: string; amount_ml: number; brand: string }>(
        `update public.breastfeeds
         set ended_at = now(), amount_ml = 120, brand = 'Marca X'
         where id = $1
         returning ended_at, amount_ml, brand`,
        [creado[0]?.id],
      );

      expect(rows[0]?.amount_ml).toBe(120);
      expect(rows[0]?.brand).toBe('Marca X');
      expect(rows[0]?.ended_at).not.toBeNull();
    } finally {
      await owner.end();
    }
  });

  it('el lado del pecho no se puede poner en un biberón', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const error = await expectDenied(
        owner.query(
          `insert into public.breastfeeds
             (id, household_id, baby_id, started_at, feed_kind, side, created_by)
           values ($1, $2, $3, now(), 'formula', 'left', $4)`,
          [randomUUID(), fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
        ),
      );

      expect(error.message).toMatch(/breastfeeds_side_only_for_breast/);
    } finally {
      await owner.end();
    }
  });
});

describe('historial de correcciones', () => {
  it('cada edición deja una fila con el antes y el después', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const sintoma = await crearSintoma(owner, fixture.users.owner.profileId);

      await owner.query(`update public.symptoms set severity = 2 where id = $1`, [sintoma.id]);

      const { rows } = await owner.query<{
        kind: string;
        changes: Record<string, { from: unknown; to: unknown }>;
        changed_by: string;
      }>(
        `select kind, changes, changed_by
         from public.event_revisions
         where entity_type = 'symptoms' and entity_id = $1`,
        [sintoma.id],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]?.kind).toBe('edit');
      expect(rows[0]?.changes.severity?.to).toBe(2);
      expect(rows[0]?.changed_by).toBe(fixture.users.owner.profileId);
    } finally {
      await owner.end();
    }
  });

  it('una actualización que no cambia nada no ensucia el historial', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const sintoma = await crearSintoma(owner, fixture.users.owner.profileId);

      await owner.query(`update public.symptoms set symptom_type = 'skin_rash' where id = $1`, [
        sintoma.id,
      ]);

      const { rows } = await owner.query(
        `select id from public.event_revisions where entity_id = $1`,
        [sintoma.id],
      );

      expect(rows).toHaveLength(0);

      const { rows: fila } = await owner.query<{ edited_at: string | null }>(
        `select edited_at from public.symptoms where id = $1`,
        [sintoma.id],
      );
      expect(fila[0]?.edited_at).toBeNull();
    } finally {
      await owner.end();
    }
  });

  it('un borrado lógico se registra como borrado y no marca "Editado"', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const sintoma = await crearSintoma(owner, fixture.users.owner.profileId);

      await owner.query(`update public.symptoms set deleted_at = now() where id = $1`, [
        sintoma.id,
      ]);

      const { rows } = await owner.query<{ kind: string }>(
        `select kind from public.event_revisions where entity_id = $1`,
        [sintoma.id],
      );

      expect(rows[0]?.kind).toBe('delete');

      const { rows: fila } = await admin.query<{ edited_at: string | null }>(
        `select edited_at from public.symptoms where id = $1`,
        [sintoma.id],
      );
      expect(fila[0]?.edited_at).toBeNull();
    } finally {
      await owner.end();
    }
  });

  it('nadie puede escribir el historial a mano', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const error = await expectDenied(
        owner.query(
          `insert into public.event_revisions
             (household_id, entity_type, entity_id, changes)
           values ($1, 'symptoms', $2, '{}'::jsonb)`,
          [fixture.householdId, randomUUID()],
        ),
      );

      expect(error.message).toMatch(/permission denied|row-level security/i);
    } finally {
      await owner.end();
    }
  });

  it('un profesional de solo lectura puede consultar el historial de su hogar', async () => {
    const professional = await connectAs(fixture.users.professional.authUserId);

    try {
      const { rows } = await professional.query(
        `select id from public.event_revisions where household_id = $1`,
        [fixture.householdId],
      );

      expect(rows.length).toBeGreaterThan(0);
    } finally {
      await professional.end();
    }
  });

  it('alguien de fuera del hogar no ve nada del historial', async () => {
    const stranger = await connectAs(fixture.users.stranger.authUserId);

    try {
      const { rows } = await stranger.query(`select id from public.event_revisions`);
      expect(rows).toHaveLength(0);
    } finally {
      await stranger.end();
    }
  });
});

describe('quién puede corregir qué', () => {
  it('un cuidador corrige lo que él mismo acaba de registrar', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);

    try {
      const propio = await crearSintoma(caregiver, fixture.users.caregiver.profileId);

      const { rowCount } = await caregiver.query(
        `update public.symptoms set severity = 1 where id = $1`,
        [propio.id],
      );

      expect(rowCount).toBe(1);
    } finally {
      await caregiver.end();
    }
  });

  it('un cuidador no puede corregir lo que registró otra persona', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);
    const ajeno = await crearSintoma(owner, fixture.users.owner.profileId);
    await owner.end();

    const caregiver = await connectAs(fixture.users.caregiver.authUserId);
    try {
      const { rowCount } = await caregiver.query(
        `update public.symptoms set severity = 3 where id = $1`,
        [ajeno.id],
      );

      // RLS no lanza error: simplemente la fila no existe para quien no puede.
      expect(rowCount).toBe(0);
    } finally {
      await caregiver.end();
    }
  });

  it('pasada su ventana de corrección, un cuidador ya no puede editar lo suyo', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);
    const antiguo = await crearSintoma(caregiver, fixture.users.caregiver.profileId);
    await caregiver.end();

    // Se envejece la fila: la ventana se mide sobre created_at.
    await admin.query(
      `update public.symptoms set created_at = now() - interval '2 days' where id = $1`,
      [antiguo.id],
    );

    const otraVez = await connectAs(fixture.users.caregiver.authUserId);
    try {
      const { rowCount } = await otraVez.query(
        `update public.symptoms set severity = 3 where id = $1`,
        [antiguo.id],
      );

      expect(rowCount).toBe(0);
    } finally {
      await otraVez.end();
    }
  });

  it('la madre, el padre o el responsable sí pueden corregir un registro antiguo', async () => {
    const caregiver = await connectAs(fixture.users.caregiver.authUserId);
    const antiguo = await crearSintoma(caregiver, fixture.users.caregiver.profileId);
    await caregiver.end();

    await admin.query(
      `update public.symptoms set created_at = now() - interval '2 days' where id = $1`,
      [antiguo.id],
    );

    const owner = await connectAs(fixture.users.owner.authUserId);
    try {
      const { rowCount } = await owner.query(
        `update public.symptoms set severity = 2 where id = $1`,
        [antiguo.id],
      );

      expect(rowCount).toBe(1);
    } finally {
      await owner.end();
    }
  });

  it('un profesional de solo lectura no corrige nada', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);
    const sintoma = await crearSintoma(owner, fixture.users.owner.profileId);
    await owner.end();

    const professional = await connectAs(fixture.users.professional.authUserId);
    try {
      const { rowCount } = await professional.query(
        `update public.symptoms set severity = 3 where id = $1`,
        [sintoma.id],
      );

      expect(rowCount).toBe(0);
    } finally {
      await professional.end();
    }
  });
});

describe('la línea de tiempo cuenta lo corregido', () => {
  it('expone la marca de edición y el detalle nuevo', async () => {
    const owner = await connectAs(fixture.users.owner.authUserId);

    try {
      const { rows: creado } = await owner.query<{ id: string }>(
        `insert into public.diaper_events
           (id, household_id, baby_id, occurred_at, diaper_type, created_by)
         values ($1, $2, $3, now() - interval '1 hour', 'stool', $4)
         returning id`,
        [randomUUID(), fixture.householdId, fixture.babyId, fixture.users.owner.profileId],
      );

      await owner.query(
        `update public.diaper_events set stool_amount = 'large', visible_food_residue = true
         where id = $1`,
        [creado[0]?.id],
      );

      const { rows } = await owner.query<{ metadata: Record<string, unknown> }>(
        `select metadata from public.timeline_events where id = $1`,
        [creado[0]?.id],
      );

      expect(rows[0]?.metadata.stoolAmount).toBe('large');
      expect(rows[0]?.metadata.visibleFoodResidue).toBe(true);
      expect(rows[0]?.metadata.editedAt).not.toBeNull();
    } finally {
      await owner.end();
    }
  });
});
