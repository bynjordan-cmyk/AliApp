import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { TablesUpdate } from '@/lib/supabase/database.types';
import { toColumnPatch, type DiaperEventInput, type DiaperEventPatch } from '@/lib/validation';
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

/**
 * Corrige un pañal ya registrado.
 *
 * Es el caso más habitual de "completa después": de madrugada se guarda el
 * tipo y la hora, y por la mañana se añaden color, consistencia o cantidad.
 */
export async function updateDiaperEvent(
  id: string,
  patch: DiaperEventPatch,
  client: AliappClient = getSupabaseClient(),
): Promise<DiaperEvent> {
  const row = toColumnPatch<DiaperEventPatch, TablesUpdate<'diaper_events'>>(patch, {
    occurredAt: 'occurred_at',
    diaperType: 'diaper_type',
    stoolConsistency: 'stool_consistency',
    stoolColor: 'stool_color',
    stoolAmount: 'stool_amount',
    mucus: 'mucus',
    bloodObserved: 'blood_observed',
    visibleFoodResidue: 'visible_food_residue',
    straining: 'straining',
    unusualOdor: 'unusual_odor',
    notes: 'notes',
  });

  const [updated] = unwrap(
    'updateDiaperEvent',
    await client.from('diaper_events').update(row).eq('id', id).select('*'),
  );

  if (!updated) throw new Error('[AliApp] updateDiaperEvent: sin fila devuelta');
  return updated;
}

export async function getDiaperEvent(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<DiaperEvent> {
  const [row] = unwrap(
    'getDiaperEvent',
    await client.from('diaper_events').select('*').eq('id', id),
  );
  if (!row) throw new Error('[AliApp] getDiaperEvent: no encontrado');
  return row;
}
