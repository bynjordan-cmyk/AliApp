import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

import { listDiaperEvents } from './diaper.service';

export function useDiapers(babyId: string | null) {
  return useQuery({
    queryKey: queryKeys.diaperEvents(babyId ?? 'none'),
    queryFn: () => listDiaperEvents(babyId as string),
    enabled: Boolean(babyId),
  });
}
