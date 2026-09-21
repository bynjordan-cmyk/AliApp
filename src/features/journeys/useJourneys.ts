import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

import { listActiveJourneys, listJourneys } from './journey.service';

export function useJourneys(babyId: string | null) {
  return useQuery({
    queryKey: queryKeys.journeys(babyId ?? 'none'),
    queryFn: () => listJourneys(babyId as string),
    enabled: Boolean(babyId),
  });
}

export function useActiveJourneys(babyId: string | null) {
  return useQuery({
    queryKey: queryKeys.activeJourneys(babyId ?? 'none'),
    queryFn: () => listActiveJourneys(babyId as string),
    enabled: Boolean(babyId),
  });
}
