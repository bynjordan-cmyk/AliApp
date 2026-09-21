import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import type { SymptomInput } from '@/lib/validation';

import { createSymptom, listSymptoms } from './symptom.service';

export function useSymptoms(babyId: string | null) {
  return useQuery({
    queryKey: queryKeys.symptoms(babyId ?? 'none'),
    queryFn: () => listSymptoms(babyId as string),
    enabled: Boolean(babyId),
  });
}

export function useCreateSymptom(context: { householdId: string; createdBy: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SymptomInput) => createSymptom(input, context),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.symptoms(variables.babyId) });
      void queryClient.invalidateQueries({ queryKey: ['babies', variables.babyId, 'timeline'] });
    },
  });
}
