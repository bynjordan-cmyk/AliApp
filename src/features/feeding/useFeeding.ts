import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import type { BabyFoodEntryInput, BreastfeedInput } from '@/lib/validation';

import { createBabyFoodEntry, createBreastfeed, listBreastfeeds, listFoodEntries } from './feeding.service';

export function useFoodEntries(babyId: string | null) {
  return useQuery({
    queryKey: queryKeys.foodEntries(babyId ?? 'none'),
    queryFn: () => listFoodEntries(babyId as string),
    enabled: Boolean(babyId),
  });
}

export function useBreastfeeds(babyId: string | null) {
  return useQuery({
    queryKey: queryKeys.breastfeeds(babyId ?? 'none'),
    queryFn: () => listBreastfeeds(babyId as string),
    enabled: Boolean(babyId),
  });
}

export function useCreateBabyFoodEntry(context: { householdId: string; createdBy: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BabyFoodEntryInput) => createBabyFoodEntry(input, context),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.foodEntries(variables.babyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allergenBoard(variables.babyId) });
      void queryClient.invalidateQueries({ queryKey: ['babies', variables.babyId, 'timeline'] });
    },
  });
}

export function useCreateBreastfeed(context: { householdId: string; createdBy: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BreastfeedInput) => createBreastfeed(input, context),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.breastfeeds(variables.babyId) });
      void queryClient.invalidateQueries({ queryKey: ['babies', variables.babyId, 'timeline'] });
    },
  });
}
