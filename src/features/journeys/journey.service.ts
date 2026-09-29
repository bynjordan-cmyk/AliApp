import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { CreateJourneyInput } from '@/lib/validation';
import type { Journey, JourneyStatus } from '@/types/domain';
import { unwrap } from '@/services/errors';

/**
 * Procesos (§12).
 *
 * Un proceso organiza los datos existentes; el registro diario no cambia
 * durante un proceso. No se fijan duraciones ni calendarios clínicos: las
 * fechas las decide quien indica el plan.
 */

export async function createJourney(
  input: CreateJourneyInput,
  _createdBy: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Journey> {
  const { data, error } = await client.rpc('create_journey', { p_input: input });
  if (error) throw new Error(`[AliApp] createJourney: ${error.message}`);
  if (!data) throw new Error('[AliApp] createJourney: missing result');
  return data as unknown as Journey;
}
export async function listJourneys(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Journey[]> {
  return unwrap(
    'listJourneys',
    await client
      .from('journeys')
      .select('*, journey_targets(*)')
      .eq('baby_id', babyId)
      .order('started_on', { ascending: false }),
  );
}

export async function listActiveJourneys(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Journey[]> {
  return unwrap(
    'listActiveJourneys',
    await client
      .from('journeys')
      .select('*, journey_targets(*)')
      .eq('baby_id', babyId)
      .eq('status', 'active')
      .order('started_on', { ascending: false }),
  );
}

export async function updateJourneyStatus(
  journeyId: string,
  status: JourneyStatus,
  completedOn: string | null = null,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client
    .from('journeys')
    .update({ status, completed_on: completedOn })
    .eq('id', journeyId)
    .select('id')
    .single();

  if (error) throw new Error(`[AliApp] updateJourneyStatus: ${error.message}`);
}
