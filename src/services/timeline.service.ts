import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { TimelineEventRow } from '@/types/domain';
import type { TimelineItem } from '@/types/timeline';
import { mapTimelineRow, sortByOccurredAt } from '@/features/timeline/timeline.mapper';
import { unwrap } from '@/services/errors';

/**
 * Línea de tiempo unificada.
 *
 * Una sola consulta sobre la vista `timeline_events`: no existe tabla
 * duplicada de timeline (§16). Si algún día los datos crecen lo suficiente
 * para necesitarla, la decisión se tomará con medidas, no por anticipado.
 */

export async function getTimeline(
  babyId: string,
  range: { from: string; to: string },
  client: AliappClient = getSupabaseClient(),
): Promise<TimelineItem[]> {
  const rows = unwrap(
    'getTimeline',
    await client
      .from('timeline_events')
      .select('*')
      .eq('baby_id', babyId)
      .gte('occurred_at', range.from)
      .lt('occurred_at', range.to)
      .order('occurred_at', { ascending: false }),
  ) as TimelineEventRow[];

  const items = rows
    .map(mapTimelineRow)
    .filter((item): item is TimelineItem => item !== null);

  return sortByOccurredAt(items, 'desc');
}
