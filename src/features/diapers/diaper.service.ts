import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { DiaperEventInput } from '@/lib/validation';
import type { DiaperEvent } from '@/types/domain';
import { unwrap } from '@/services/errors';
import { buildSoftDeletePatch } from '@/services/soft-delete';

/** Pañales. Registro descriptivo: AliApp no interpreta un diagnóstico (§5). */

export async function createDiaperEvent(
  input: DiaperEventInput,
  context: { householdId: string; createdBy: string },
  client: AliappClient = getSupabaseClient(),
): Promise<DiaperEvent> {
  const [row] = unwrap(
    'createDiaperEvent',
    await client
      .from('diaper_events')
      .insert({
        id: newId(),
        household_id: context.householdId,
        baby_id: input.babyId,
        occurred_at: input.occurredAt,
        diaper_type: input.diaperType,
        stool_consistency: input.stoolConsistency ?? null,
        stool_color: input.stoolColor ?? null,
        stool_amount: input.stoolAmount ?? null,
        mucus: input.mucus ?? null,
        blood_observed: input.bloodObserved ?? null,
        visible_food_residue: input.visibleFoodResidue ?? null,
        straining: input.straining ?? null,
        unusual_odor: input.unusualOdor ?? null,
        notes: input.notes ?? null,
        created_by: context.createdBy,
      })
      .select('*'),
  );

  if (!row) throw new Error('[AliApp] createDiaperEvent: sin fila devuelta');
  return row;
}

export async function listDiaperEvents(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<DiaperEvent[]> {
  return unwrap(
    'listDiaperEvents',
    await client
      .from('diaper_events')
      .select('*')
      .eq('baby_id', babyId)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false }),
  );
}

export async function softDeleteDiaperEvent(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('diaper_events').update(buildSoftDeletePatch()).eq('id', id);
  if (error) throw new Error(`[AliApp] softDeleteDiaperEvent: ${error.message}`);
}
