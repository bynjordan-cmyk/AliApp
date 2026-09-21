import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { TablesUpdate } from '@/lib/supabase/database.types';
import { toColumnPatch, type SymptomInput, type SymptomPatch } from '@/lib/validation';
import type { Symptom } from '@/types/domain';
import { unwrap } from '@/services/errors';
import { buildSoftDeletePatch } from '@/services/soft-delete';

/**
 * Síntomas.
 *
 * Un síntoma es una observación autónoma: existe sin ninguna exposición, sin
 * episodio y sin alimento sospechoso (§27). Agruparlo en un episodio o
 * relacionarlo con exposiciones son pasos posteriores y explícitos.
 */

export async function createSymptom(
  input: SymptomInput,
  context: { householdId: string; createdBy: string },
  client: AliappClient = getSupabaseClient(),
): Promise<Symptom> {
  const [row] = unwrap(
    'createSymptom',
    await client
      .from('symptoms')
      .insert({
        id: newId(),
        household_id: context.householdId,
        baby_id: input.babyId,
        symptom_type: input.symptomType,
        started_at: input.startedAt,
        ended_at: input.endedAt ?? null,
        severity: input.severity ?? null,
        notes: input.notes ?? null,
        created_by: context.createdBy,
      })
      .select('*'),
  );

  if (!row) throw new Error('[AliApp] createSymptom: sin fila devuelta');
  return row;
}

export async function listSymptoms(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Symptom[]> {
  return unwrap(
    'listSymptoms',
    await client
      .from('symptoms')
      .select('*')
      .eq('baby_id', babyId)
      .is('deleted_at', null)
      .order('started_at', { ascending: false }),
  );
}

export async function softDeleteSymptom(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('symptoms').update(buildSoftDeletePatch()).eq('id', id);
  if (error) throw new Error(`[AliApp] softDeleteSymptom: ${error.message}`);
}

/**
 * Corrige un síntoma.
 *
 * Sigue sin existir ningún campo de alimento sospechoso: corregir un síntoma
 * nunca es la puerta trasera para atribuirle una causa (§27).
 */
export async function updateSymptom(
  id: string,
  patch: SymptomPatch,
  client: AliappClient = getSupabaseClient(),
): Promise<Symptom> {
  const row = toColumnPatch<SymptomPatch, TablesUpdate<'symptoms'>>(patch, {
    symptomType: 'symptom_type',
    startedAt: 'started_at',
    endedAt: 'ended_at',
    severity: 'severity',
    notes: 'notes',
  });

  const [updated] = unwrap(
    'updateSymptom',
    await client.from('symptoms').update(row).eq('id', id).select('*'),
  );

  if (!updated) throw new Error('[AliApp] updateSymptom: sin fila devuelta');
  return updated;
}

export async function getSymptom(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Symptom> {
  const [row] = unwrap('getSymptom', await client.from('symptoms').select('*').eq('id', id));
  if (!row) throw new Error('[AliApp] getSymptom: no encontrado');
  return row;
}
