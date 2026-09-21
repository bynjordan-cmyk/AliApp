import { QueryClient } from '@tanstack/react-query';

/**
 * Configuración de caché.
 *
 * Los datos de AliApp cambian poco entre registros, así que se mantienen
 * frescos un minuto y se reintenta con moderación: una madre con mala cobertura
 * no debe ver la pantalla parpadear.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
