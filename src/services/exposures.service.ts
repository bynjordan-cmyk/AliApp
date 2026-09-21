import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { Exposure, ExposureSourceType } from '@/types/domain';
import { unwrap } from '@/services/errors';

/**
 * Grafo de exposiciones (§11).
 *
 * Una exposición es un HECHO: "el bebé estuvo expuesto a este alimento por
 * esta vía en este instante". No afirma causalidad ni la insinúa. Relacionar
 * una exposición con un episodio es siempre un paso posterior y explícito.
 *
 * No se duplica información: `sourceType` + `sourceId` apuntan a la fila real.
 */

export type ExposureDraft = {
  householdId: string;
  babyId: string;
  sourceType: ExposureSourceType;
  sourceId: string | null;
  foodId: string | null;
  occurredAt: string;
};

export function buildExposureRows(drafts: ExposureDraft[]) {
  return drafts.map((draft) => ({
    id: newId(),
    household_id: draft.householdId,
    baby_id: draft.babyId,
    source_type: draft.sourceType,
    source_id: draft.sourceId,
    food_id: draft.foodId,
    occurred_at: draft.occurredAt,
  }));
}

export async function recordExposures(
  drafts: ExposureDraft[],
  client: AliappClient = getSupabaseClient(),
): Promise<Exposure[]> {
  if (drafts.length === 0) return [];

  return unwrap(
    'recordExposures',
    await client.from('exposures').insert(buildExposureRows(drafts)).select('*'),
  );
}

export async function listExposures(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Exposure[]> {
  return unwrap(
    'listExposures',
    await client
      .from('exposures')
      .select('*')
      .eq('baby_id', babyId)
      .order('occurred_at', { ascending: false }),
  );
}

/**
 * Exposiciones dentro de una ventana temporal anterior a un instante.
 *
 * Sirve para OFRECER candidatos a la familia cuando agrupa un episodio. La
 * ventana es un filtro de consulta, no un criterio clínico: quien decide qué
 * se relaciona es la persona, y la relación queda marcada como
 * 'temporal_candidate' hasta que alguien la confirma.
 */
export async function listExposuresBefore(
  babyId: string,
  instant: string,
  windowHours: number,
  client: AliappClient = getSupabaseClient(),
): Promise<Exposure[]> {
  const to = new Date(instant);
  const from = new Date(to.getTime() - windowHours * 60 * 60 * 1000);

  return unwrap(
    'listExposuresBefore',
    await client
      .from('exposures')
      .select('*')
      .eq('baby_id', babyId)
      .gte('occurred_at', from.toISOString())
      .lte('occurred_at', to.toISOString())
      .order('occurred_at', { ascending: false }),
  );
}

/**
 * Mueve las exposiciones derivadas de un evento cuando se corrige su hora.
 *
 * Una exposición no tiene hora propia: hereda la del evento que la originó. Si
 * alguien corrige que la toma fue a las 02:40 y no a las 03:10, el grafo debe
 * contar lo mismo que la línea de tiempo (§8, §11).
 */
export async function moveExposuresForSource(
  sourceId: string,
  occurredAt: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client
    .from('exposures')
    .update({ occurred_at: occurredAt })
    .eq('source_id', sourceId);

  if (error) throw new Error(`[AliApp] moveExposuresForSource: ${error.message}`);
}

/** Borra las exposiciones de un evento. Se usa al rehacer la lista de alimentos. */
export async function clearExposuresForSource(
  sourceId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('exposures').delete().eq('source_id', sourceId);
  if (error) throw new Error(`[AliApp] clearExposuresForSource: ${error.message}`);
}
