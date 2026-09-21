import { randomUUID } from 'node:crypto';

import { Client } from 'pg';

/**
 * Utilidades para las pruebas de base de datos.
 *
 * Cada prueba abre una conexión, adopta el rol `authenticated` y fija los
 * claims del JWT, que es exactamente lo que hace Supabase al atender una
 * petición del cliente. Así lo que se comprueba son las políticas reales.
 */

export const CONNECTION_STRING =
  process.env.ALIAPP_TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:55432/aliapp_test';

export async function connectAsPostgres(): Promise<Client> {
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  return client;
}

/** Conexión que actúa como un usuario autenticado concreto. */
export async function connectAs(authUserId: string): Promise<Client> {
  const client = await connectAsPostgres();
  await client.query(`set role authenticated`);
  await client.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: authUserId, role: 'authenticated' }),
  ]);
  return client;
}

/** Conexión anónima: ni sesión ni membresía. */
export async function connectAsAnonymousUser(): Promise<Client> {
  const client = await connectAsPostgres();
  await client.query(`set role authenticated`);
  await client.query(`select set_config('request.jwt.claims', $1, false)`, [
    JSON.stringify({ sub: randomUUID(), role: 'authenticated' }),
  ]);
  return client;
}

export type Fixture = {
  householdId: string;
  babyId: string;
  foodIds: Record<string, string>;
  users: {
    owner: { authUserId: string; profileId: string };
    caregiver: { authUserId: string; profileId: string };
    professional: { authUserId: string; profileId: string };
    revoked: { authUserId: string; profileId: string };
    stranger: { authUserId: string; profileId: string };
  };
};

async function createUser(admin: Client, label: string) {
  const authUserId = randomUUID();
  await admin.query(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ($1, $2, jsonb_build_object('display_name', $3::text, 'locale', 'es'))`,
    [authUserId, `${label}-${authUserId}@aliapp.test`, label],
  );

  const { rows } = await admin.query<{ id: string }>(
    `select id from public.profiles where auth_user_id = $1`,
    [authUserId],
  );

  const profileId = rows[0]?.id;
  if (!profileId) {
    throw new Error(`El trigger de auth.users no creó el perfil de ${label}`);
  }

  return { authUserId, profileId };
}

/**
 * Crea un hogar aislado con su bebé y una persona por cada rol.
 * Cada prueba usa su propio hogar, así que no dependen unas de otras.
 */
export async function createFixture(admin: Client): Promise<Fixture> {
  const owner = await createUser(admin, 'owner');
  const caregiver = await createUser(admin, 'caregiver');
  const professional = await createUser(admin, 'professional');
  const revoked = await createUser(admin, 'revoked');
  const stranger = await createUser(admin, 'stranger');

  const householdId = randomUUID();
  await admin.query(`insert into public.households (id, name) values ($1, $2)`, [
    householdId,
    `Hogar ${householdId.slice(0, 8)}`,
  ]);

  await admin.query(
    `insert into public.household_members (household_id, profile_id, role, status)
     values ($1::uuid, $2::uuid, 'owner', 'active'),
            ($1::uuid, $3::uuid, 'caregiver', 'active'),
            ($1::uuid, $4::uuid, 'professional_viewer', 'active'),
            ($1::uuid, $5::uuid, 'parent', 'revoked')`,
    [householdId, owner.profileId, caregiver.profileId, professional.profileId, revoked.profileId],
  );

  const babyId = randomUUID();
  await admin.query(
    `insert into public.babies (id, household_id, name, birth_date, created_by)
     values ($1, $2, 'Bebé de prueba', current_date - interval '7 months', $3)`,
    [babyId, householdId, owner.profileId],
  );

  const { rows: foods } = await admin.query<{ canonical_key: string; id: string }>(
    `select canonical_key, id from public.foods where canonical_key in ('hen_egg', 'cow_milk', 'rice')`,
  );

  const foodIds = Object.fromEntries(foods.map((row) => [row.canonical_key, row.id]));

  return {
    householdId,
    babyId,
    foodIds,
    users: { owner, caregiver, professional, revoked, stranger },
  };
}

/** Comprueba que una consulta falla por política RLS o por permisos. */
export async function expectDenied(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }
  throw new Error('Se esperaba que la base de datos denegara la operación, pero fue aceptada');
}
