import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useI18n } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

import type { FoodStatus } from '@/types/domain';

import { getAllergenBoard, listFoods, setFoodStatus } from './food.service';
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

/**
 * Fija el estado de un alimento.
 *
 * Siempre lo hace una persona: `statusSource` nunca es 'system_summary', el
 * esquema no lo admite y la base lo bloquea con un trigger. AliApp no marca
 * nada como Evitar por su cuenta (§5, §10).
 */
export function useSetFoodStatus(babyId: string | null, updatedBy: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { foodId: string; status: FoodStatus }) =>
      setFoodStatus(
        {
          babyId: babyId as string,
          foodId: input.foodId,
          status: input.status,
          statusSource: 'family',
        },
        updatedBy as string,
      ),
    onSuccess: () => {
      if (babyId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.allergenBoard(babyId) });
      }
    },
  });
}
