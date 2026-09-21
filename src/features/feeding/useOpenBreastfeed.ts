import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

import { findOpenBreastfeed } from './feeding.service';

/**
 * Toma de pecho empezada y sin cerrar.
 *
 * Es lo que permite el registro en dos toques: si hay una abierta, el botón
 * dice "terminar"; si no, dice "empezar". Se refresca con frecuencia porque
 * la otra persona del hogar puede haberla empezado desde su móvil.
 */
export function useOpenBreastfeed(babyId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.breastfeeds(babyId ?? 'none'), 'open'],
    queryFn: () => findOpenBreastfeed(babyId as string),
    enabled: Boolean(babyId),
    staleTime: 15 * 1000,
  });
}
