import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { MedicationEventInput } from '@/lib/validation';
import type { MedicationEvent } from '@/types/domain';
import { unwrap } from '@/services/errors';
import { buildSoftDeletePatch } from '@/services/soft-delete';

/**
 * Medicación administrada.
 *
 * Registro puramente factual de lo que la familia introduce. AliApp nunca
 * calcula, sugiere ni valida dosis (§10).
 */

export async function createMedicationEvent(
  input: MedicationEventInput,
  context: { householdId: string; createdBy: string },
  client: AliappClient = getSupabaseClient(),
): Promise<MedicationEvent> {
  const [row] = unwrap(
    'createMedicationEvent',
    await client
      .from('medication_events')
      .insert({
        id: newId(),
        household_id: context.householdId,
        baby_id: input.babyId,
        name: input.name,
        dose_text: input.doseText ?? null,
        occurred_at: input.occurredAt,
        reason_text: input.reasonText ?? null,
        notes: input.notes ?? null,
        created_by: context.createdBy,
      })
      .select('*'),
  );

  if (!row) throw new Error('[AliApp] createMedicationEvent: sin fila devuelta');
  return row;
}

export async function listMedicationEvents(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<MedicationEvent[]> {
  return unwrap(
    'listMedicationEvents',
    await client
      .from('medication_events')
      .select('*')
      .eq('baby_id', babyId)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false }),
  );
}

export async function softDeleteMedicationEvent(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client
    .from('medication_events')
    .update(buildSoftDeletePatch())
    .eq('id', id);

  if (error) throw new Error(`[AliApp] softDeleteMedicationEvent: ${error.message}`);
}
