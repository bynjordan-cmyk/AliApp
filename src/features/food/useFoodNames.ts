import { useMemo } from 'react';

import { useFoods } from './useFoods';

/**
 * Nombres de alimentos ya resueltos al idioma activo, indexados por id y por
 * clave canónica.
 *
 * La línea de tiempo y el panel guardan claves estables ('hen_egg'), que son
 * correctas como dato pero no son texto para una persona (§20).
 */
export function useFoodNames() {
  const { data } = useFoods();

  return useMemo(() => {
    const byId = new Map<string, string>();
    const byKey = new Map<string, string>();

    for (const food of data ?? []) {
      byId.set(food.id, food.displayName);
      byKey.set(food.canonical_key, food.displayName);
    }

    return {
      byId,
      byKey,
      nameForKey: (key: string) => byKey.get(key) ?? key,
      nameForId: (id: string | null | undefined) => (id ? (byId.get(id) ?? '') : ''),
    };
  }, [data]);
}
