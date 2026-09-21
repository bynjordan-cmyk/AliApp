import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { listExposuresBefore } from '@/services/exposures.service';
import type { EpisodeExposureRelation, ExposureConfidenceLabel } from '@/types/domain';

import { addSymptomsToEpisode, createEpisode, linkExposuresToEpisode } from './reaction.service';
import {
  candidatesWithinWindow,
  type ExposureWindowHours,
  type ExposureCandidate,
} from './exposure-window';

/**
 * Exposiciones registradas antes de un síntoma, dentro de la ventana elegida.
 *
 * Se consulta siempre la ventana más amplia (24 h) y se filtra en memoria, de
 * modo que cambiar de 6 a 24 horas no dispara una consulta nueva.
 */
export function useExposureCandidates(
  babyId: string | null,
  symptomAt: string | null,
  windowHours: ExposureWindowHours,
) {
  const query = useQuery({
    queryKey: [...queryKeys.exposures(babyId ?? 'none'), 'before', symptomAt],
    queryFn: () => listExposuresBefore(babyId as string, symptomAt as string, 24),
    enabled: Boolean(babyId && symptomAt),
  });

  const candidates: ExposureCandidate[] = symptomAt
    ? candidatesWithinWindow(query.data ?? [], symptomAt, windowHours)
    : [];

  return { ...query, candidates };
}

export type SaveEpisodeInput = {
  babyId: string;
  startedAt: string;
  symptomIds: string[];
  notes?: string;
  links: {
    exposureId: string;
    relationType?: EpisodeExposureRelation;
    confidenceLabel?: ExposureConfidenceLabel;
  }[];
};

/**
 * Crea el episodio, agrupa los síntomas y relaciona las exposiciones elegidas.
 *
 * Las relaciones se guardan como `manual` porque las eligió una persona, y sin
 * etiqueta de confianza: describir la consistencia temporal es un paso
 * posterior y con más datos, nunca una conclusión de este formulario.
 */
export function useSaveEpisode(context: { householdId: string; createdBy: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveEpisodeInput) => {
      const episodio = await createEpisode(
        {
          babyId: input.babyId,
          startedAt: input.startedAt,
          status: 'open',
          symptomIds: [],
          notes: input.notes,
        },
        context,
      );

      if (input.symptomIds.length > 0) {
        await addSymptomsToEpisode(episodio.id, input.symptomIds);
      }

      if (input.links.length > 0) {
        await linkExposuresToEpisode(
          episodio.id,
          input.links.map((link) => ({
            exposureId: link.exposureId,
            relationType: link.relationType ?? 'manual',
            confidenceLabel: link.confidenceLabel,
          })),
        );
      }

      return episodio;
    },
    onSuccess: (_episodio, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.episodes(variables.babyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.symptoms(variables.babyId) });
      void queryClient.invalidateQueries({ queryKey: ['babies', variables.babyId, 'timeline'] });
    },
  });
}
