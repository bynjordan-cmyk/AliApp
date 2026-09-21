import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { EventRevision } from '@/types/domain';
import type { TimelineItemType } from '@/types/timeline';
import { unwrap } from '@/services/errors';

/**
 * Acceso común a un registro cualquiera de la línea de tiempo.
 *
 * La pantalla de detalle es la misma para los seis tipos, así que necesita
 * saber a qué tabla corresponde cada uno. Ese mapa vive aquí y en ningún otro
 * sitio.
 */

export const SOURCE_TABLE_BY_TYPE = {
  food_entry: 'food_entries',
  breastfeed: 'breastfeeds',
  diaper_event: 'diaper_events',
  symptom: 'symptoms',
  reaction_episode: 'reaction_episodes',
  medication_event: 'medication_events',
} as const satisfies Record<TimelineItemType, string>;

export type RecordSourceTable = (typeof SOURCE_TABLE_BY_TYPE)[TimelineItemType];

export function isRecordType(value: string): value is TimelineItemType {
  return value in SOURCE_TABLE_BY_TYPE;
}

/** Columna que guarda "cuándo ocurrió" en cada tabla. Nunca es `created_at` (§8). */
export const OCCURRED_COLUMN_BY_TYPE = {
  food_entry: 'occurred_at',
  breastfeed: 'started_at',
  diaper_event: 'occurred_at',
  symptom: 'started_at',
  reaction_episode: 'started_at',
  medication_event: 'occurred_at',
} as const satisfies Record<TimelineItemType, string>;

/**
 * Historial de correcciones de un registro.
 *
 * Solo lectura: nadie escribe aquí desde el cliente, lo hace un trigger de la
 * base.
 */
export async function listRevisions(
  type: TimelineItemType,
  entityId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<EventRevision[]> {
  return unwrap(
    'listRevisions',
    await client
      .from('event_revisions')
      .select('*')
      .eq('entity_type', SOURCE_TABLE_BY_TYPE[type])
      .eq('entity_id', entityId)
      .order('changed_at', { ascending: false }),
  );
}
