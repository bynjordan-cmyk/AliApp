import { newId } from '@/lib/ids';
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
  createdBy: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Journey> {
  const journeyId = newId();

  const [journey] = unwrap(
    'createJourney',
    await client
      .from('journeys')
      .insert({
        id: journeyId,
        household_id: input.householdId,
        baby_id: input.babyId,
        journey_type: input.journeyType,
        status: input.status,
        started_on: input.startedOn,
        review_on: input.reviewOn ?? null,
        indicated_by: input.indicatedBy,
        professional_name: input.professionalName ?? null,
        notes: input.notes ?? null,
        created_by: createdBy,
      })
      .select('*'),
  );

  if (!journey) throw new Error('[AliApp] createJourney: sin fila devuelta');

  if (input.targets.length > 0) {
    unwrap(
      'createJourney.targets',
      await client
        .from('journey_targets')
        .insert(
          input.targets.map((target) => ({
            id: newId(),
            journey_id: journeyId,
            food_id: target.foodId,
            target_subject: target.targetSubject,
            action: target.action,
          })),
        )
        .select('id'),
    );
  }

  return journey;
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
    .eq('id', journeyId);

  if (error) throw new Error(`[AliApp] updateJourneyStatus: ${error.message}`);
}
