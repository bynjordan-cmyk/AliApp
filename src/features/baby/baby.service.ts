import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { Baby, Household, HouseholdMember, Profile } from '@/types/domain';
import type { CreateBabyInput, CreateHouseholdInput } from '@/lib/validation';
import { unwrap, unwrapMaybe } from '@/services/errors';
import { buildSoftDeletePatch } from '@/services/soft-delete';

/** Acceso a hogar, perfil y bebés. Ninguna pantalla habla con Supabase directamente. */

export async function getCurrentProfile(
  client: AliappClient = getSupabaseClient(),
): Promise<Profile | null> {
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return null;

  return unwrapMaybe(
    'getCurrentProfile',
    await client.from('profiles').select('*').eq('auth_user_id', auth.user.id).maybeSingle(),
  );
}

export async function listHouseholds(
  client: AliappClient = getSupabaseClient(),
): Promise<Household[]> {
  return unwrap(
    'listHouseholds',
    await client.from('households').select('*').order('created_at', { ascending: true }),
  );
}

/**
 * Crea el hogar y su responsable de forma atómica.
 * No hay política de INSERT directa sobre `households`: este RPC es el camino.
 */
export async function createHousehold(
  input: CreateHouseholdInput,
  client: AliappClient = getSupabaseClient(),
): Promise<Household> {
  const { data, error } = await client.rpc('create_household', {
    p_name: input.name,
    p_locale: input.locale,
  });

  if (error) {
    throw new Error(`[AliApp] createHousehold: ${error.message}`);
  }

  return data as unknown as Household;
}

export async function listMembers(
  householdId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<HouseholdMember[]> {
  return unwrap(
    'listMembers',
    await client.from('household_members').select('*').eq('household_id', householdId),
  );
}

export async function listBabies(
  householdId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Baby[]> {
  return unwrap(
    'listBabies',
    await client
      .from('babies')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
  );
}

export async function createBaby(
  input: CreateBabyInput,
  createdBy: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Baby> {
  const rows = unwrap(
    'createBaby',
    await client
      .from('babies')
      .insert({
        id: newId(),
        household_id: input.householdId,
        name: input.name,
        birth_date: input.birthDate ?? null,
        feeding_mode: input.feedingMode,
        created_by: createdBy,
      })
      .select('*'),
  );

  const [baby] = rows;
  if (!baby) throw new Error('[AliApp] createBaby: la inserción no devolvió ninguna fila');
  return baby;
}

/** Borrado lógico. El historial clínico nunca se borra físicamente. */
export async function softDeleteBaby(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('babies').update(buildSoftDeletePatch()).eq('id', babyId);
  if (error) throw new Error(`[AliApp] softDeleteBaby: ${error.message}`);
}
