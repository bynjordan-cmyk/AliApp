import { useMemo } from 'react';

import { useI18n } from '@/lib/i18n';
import type { FoodStatus } from '@/types/domain';
import { useAllergenBoard, useFoods } from '@/features/food/useFoods';

import type { CatalogEntry } from './ingredients';

/**
 * Catálogo con el que se compara una etiqueta.
 *
 * Junta dos cosas que ya existen: los nombres de los alimentos en el idioma
 * activo (con los alias del propio catálogo) y el estado que la familia les ha
 * puesto en su panel.
 *
 * El estado lo fija SIEMPRE una persona. AliApp no marca nada como Evitar por
 * su cuenta, ni aquí ni en ningún sitio (§10).
 */
export function useLabelCatalog(babyId: string | null) {
  const { locale } = useI18n();
  const foods = useFoods();
  const board = useAllergenBoard(babyId);

  const catalog = useMemo<CatalogEntry[]>(
    () =>
      (foods.data ?? []).map((food) => {
        const porIdioma = (food.aliases ?? {}) as Record<string, unknown>;
        const propios = porIdioma[locale];

        return {
          canonicalKey: food.canonical_key,
          displayName: food.displayName,
          aliases: Array.isArray(propios) ? propios.filter((a): a is string => typeof a === 'string') : [],
        };
      }),
    [foods.data, locale],
  );

  const statusByKey = useMemo<Record<string, FoodStatus>>(() => {
    const mapa: Record<string, FoodStatus> = {};
    for (const fila of board.data ?? []) {
      if (fila.canonical_key) {
        mapa[fila.canonical_key] = (fila.status ?? 'unknown') as FoodStatus;
      }
    }
    return mapa;
  }, [board.data]);

  /** ¿La familia tiene algo marcado como Evitar? Cambia lo que se puede decir. */
  const hasAvoidList = useMemo(
    () => Object.values(statusByKey).some((status) => status === 'avoid'),
    [statusByKey],
  );

  return {
    catalog,
    statusByKey,
    hasAvoidList,
    isLoading: foods.isLoading || board.isLoading,
    isError: foods.isError || board.isError,
    refetch: () => {
      void foods.refetch();
      void board.refetch();
    },
  };
}
