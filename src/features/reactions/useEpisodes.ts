import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

import { listEpisodes } from './reaction.service';

export function useEpisodes(babyId: string | null) {
  return useQuery({
    queryKey: queryKeys.episodes(babyId ?? 'none'),
    queryFn: () => listEpisodes(babyId as string),
    enabled: Boolean(babyId),
  });
}
