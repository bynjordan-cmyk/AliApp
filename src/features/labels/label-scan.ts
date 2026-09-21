import type { FoodStatus } from '@/types/domain';

import { matchIngredients, parseIngredientList, type CatalogEntry } from './ingredients';

/**
 * Resultado de leer una etiqueta.
 *
 * El orden de la pantalla nace de aquí: primero lo que la familia marcó como
 * Evitar, luego lo que está bajo supervisión profesional, y al final el resto
 * de coincidencias, que son informativas.
 *
 * Lo que NUNCA se genera:
 *   · "este alimento es seguro",
 *   · "puedes dárselo",
 *   · "no contiene alérgenos".
 *
 * Ausencia de coincidencia significa exactamente una cosa: ninguna palabra
 * leída coincide con la lista de esta familia. No dice nada del producto.
 */

export type LabelScanFinding = {
  /** Ingrediente leído, ya normalizado. */
  ingredient: string;
  canonicalKey: string;
  displayName: string;
  /** Palabra que produjo la coincidencia ("caseinato"). */
  matchedTerm: string;
  status: FoodStatus;
};

export type LabelScanResult = {
  /** Texto original detectado. Siempre se enseña: es lo que se ha leído. */
  rawText: string;
  ingredients: string[];
  /** Coincidencias con alimentos marcados como Evitar. */
  avoid: LabelScanFinding[];
  /** Coincidencias con alimentos bajo supervisión profesional. */
  supervision: LabelScanFinding[];
  /** Resto de coincidencias con el panel de alimentos. Solo informativas. */
  other: LabelScanFinding[];
  /** Ingredientes que no coinciden con nada del panel. */
  unmatched: string[];
};

export type LabelScanInput = {
  rawText: string;
  catalog: readonly CatalogEntry[];
  /** Estado por alimento, tal como lo fijó una persona en el panel. */
  statusByKey: Readonly<Record<string, FoodStatus>>;
  /**
   * Ingredientes confirmados por quien escanea. Si se pasan, sustituyen a los
   * detectados automáticamente: la última palabra es siempre de la persona.
   */
  confirmedIngredients?: readonly string[];
};

export function buildLabelScanResult({
  rawText,
  catalog,
  statusByKey,
  confirmedIngredients,
}: LabelScanInput): LabelScanResult {
  const ingredients = confirmedIngredients
    ? [...confirmedIngredients]
    : parseIngredientList(rawText);

  const matches = matchIngredients(ingredients, catalog);

  const findings: LabelScanFinding[] = matches.map((match) => ({
    ...match,
    status: statusByKey[match.canonicalKey] ?? 'unknown',
  }));

  const conCoincidencia = new Set(findings.map((finding) => finding.ingredient));

  return {
    rawText,
    ingredients,
    avoid: findings.filter((finding) => finding.status === 'avoid'),
    supervision: findings.filter((finding) => finding.status === 'professional_supervision'),
    other: findings.filter(
      (finding) =>
        finding.status !== 'avoid' && finding.status !== 'professional_supervision',
    ),
    unmatched: ingredients.filter((ingredient) => !conCoincidencia.has(ingredient)),
  };
}

/** ¿Hay algo que mirar con atención? Ni puntuación ni semáforo: un booleano. */
export function hasMarkedMatches(result: LabelScanResult): boolean {
  return result.avoid.length > 0 || result.supervision.length > 0;
}

/**
 * Lista de ingredientes detectados, para la frase "Detectamos: …".
 *
 * Enumera lo leído y nada más. Sin adjetivos, sin conclusiones.
 */
export function describeDetected(result: LabelScanResult, max = 6): string {
  return result.ingredients.slice(0, max).join(', ');
}
