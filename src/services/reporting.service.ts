import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Capa de informes (§18).
 *
 * Punto único de entrada para cualquier informe por rango de fechas. El futuro
 * PDF consumirá ESTA capa; nunca debe consultar tablas sueltas desde la UI.
 *
 * Devuelve hechos del periodo. No calcula causalidad, ni riesgo, ni
 * recomendaciones, ni un porcentaje de nada (§10).
 */

export type ReportRange = {
  from: string;
  to: string;
};

export type ReportSnapshot = {
  generatedAt: string;
  range: ReportRange;
  baby: Json;
  journeys: Json;
  timeline: Json;
  exposures: Json;
  episodes: Json;
  media: Json;
  foodStatus: Json;
};

export async function buildReport(
  babyId: string,
  range: ReportRange,
  client: AliappClient = getSupabaseClient(),
): Promise<ReportSnapshot> {
  const { data, error } = await client.rpc('build_report', {
    p_baby_id: babyId,
    p_from: range.from,
    p_to: range.to,
  });

  if (error) throw new Error(`[AliApp] buildReport: ${error.message}`);

  return data as unknown as ReportSnapshot;
}
