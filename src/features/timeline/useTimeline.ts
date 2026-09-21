import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { getTimeline } from '@/services/timeline.service';

import { groupByDay } from './timeline.mapper';

/** Línea de tiempo de un bebé en un rango, ya agrupada por día local. */
export function useTimeline(babyId: string | null, range: { from: string; to: string }) {
  const query = useQuery({
    queryKey: queryKeys.timeline(babyId ?? 'none', range.from, range.to),
    queryFn: () => getTimeline(babyId as string, range),
    enabled: Boolean(babyId),
  });

  return {
    ...query,
    days: groupByDay(query.data ?? []),
  };
}
