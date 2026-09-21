import type { AllergenBoardRow, FoodStatus } from '@/types/domain';
import { FOOD_STATUSES } from '@/types/domain';

/**
 * Panel de alimentos (§13).
 *
 * Agrupa por estado actual y muestra hechos: número de exposiciones, primera y
 * última, y quién fijó el estado. Sin rachas, sin premios por restricción y sin
 * ninguna puntuación de riesgo (§10).
 */

export type AllergenBoardGroup = {
  status: FoodStatus;
  items: AllergenBoardRow[];
};

export function groupBoardByStatus(rows: AllergenBoardRow[]): AllergenBoardGroup[] {
  const groups = new Map<FoodStatus, AllergenBoardRow[]>(
    FOOD_STATUSES.map((status) => [status, [] as AllergenBoardRow[]]),
  );

  for (const row of rows) {
    const status = (row.status ?? 'unknown') as FoodStatus;
    groups.get(status)?.push(row);
  }

  return FOOD_STATUSES.map((status) => ({
    status,
    items: (groups.get(status) ?? []).sort((a, b) =>
      (a.canonical_key ?? '').localeCompare(b.canonical_key ?? ''),
    ),
  }));
}

/** Alimentos marcados como "evitar": lo primero que necesita ver un cuidador. */
export function foodsToAvoid(rows: AllergenBoardRow[]): AllergenBoardRow[] {
  return rows.filter((row) => row.status === 'avoid' || row.status === 'professional_supervision');
}

export function boardSummary(rows: AllergenBoardRow[]): Record<FoodStatus, number> {
  const summary = Object.fromEntries(
    FOOD_STATUSES.map((status) => [status, 0]),
  ) as Record<FoodStatus, number>;

  for (const row of rows) {
    const status = (row.status ?? 'unknown') as FoodStatus;
    summary[status] += 1;
  }

  return summary;
}
