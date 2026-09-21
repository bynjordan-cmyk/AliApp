import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

import { getAllergenBoard, listFoods } from './food.service';
import { groupBoardByStatus } from './allergen-board';

export function useFoods() {
  const { locale } = useI18n();

  return useQuery({
    queryKey: queryKeys.foods(locale),
    queryFn: () => listFoods(locale),
    staleTime: 1000 * 60 * 60,
  });
}

export function useAllergenBoard(babyId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.allergenBoard(babyId ?? 'none'),
    queryFn: () => getAllergenBoard(babyId as string),
    enabled: Boolean(babyId),
  });

  return {
    ...query,
    groups: groupBoardByStatus(query.data ?? []),
  };
}
