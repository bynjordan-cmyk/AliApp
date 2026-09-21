import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { getSignedUrl, listMediaFor, softDeleteMedia } from '@/services/media.service';
import type { MediaAsset, MediaEntityType } from '@/types/domain';

export type MediaWithUrl = MediaAsset & { signedUrl: string | null };

/**
 * Adjuntos de una entidad, con su URL firmada ya resuelta.
 *
 * El bucket es privado: no existe URL pública. Las firmas son de vida corta,
 * así que la consulta se refresca sola antes de que caduquen.
 */
export function useMedia(entityType: MediaEntityType, entityId: string | null) {
  return useQuery<MediaWithUrl[]>({
    queryKey: queryKeys.media(entityType, entityId ?? 'none'),
    queryFn: async () => {
      const assets = await listMediaFor(entityType, entityId as string);

      return Promise.all(
        assets.map(async (asset) => {
          try {
            return { ...asset, signedUrl: await getSignedUrl(asset.storage_path) };
          } catch {
            // Una firma caducada o un fichero movido no deben tumbar la pantalla.
            return { ...asset, signedUrl: null };
          }
        }),
      );
    },
    enabled: Boolean(entityId),
    // Las URLs firmadas duran 10 minutos; se renuevan antes.
    staleTime: 1000 * 60 * 7,
  });
}

export function useDeleteMedia(entityType: MediaEntityType, entityId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => softDeleteMedia(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.media(entityType, entityId ?? 'none'),
      });
    },
  });
}
