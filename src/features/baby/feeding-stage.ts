import { deriveBabyAge } from '@/lib/dates';
import type { Baby, FeedingStage } from '@/types/domain';

/**
 * Etapa alimentaria del bebé.
 *
 * REGLA QUE MANDA SOBRE TODO LO DEMÁS: la respuesta explícita de la familia a
 * "¿Ya comenzó alimentos sólidos?" prevalece siempre. La edad puede SUGERIR
 * una etapa en la interfaz, pero AliApp no decide cuándo un bebé empieza con
 * sólidos: eso se habla con el profesional sanitario y se responde aquí.
 *
 * Por eso `suggestStageFromAge` devuelve una sugerencia que la interfaz puede
 * ofrecer, y `resolveStage` nunca la usa para contradecir lo que la familia ya
 * ha dicho.
 */

export const FEEDING_STAGES: readonly FeedingStage[] = [
  'milk_only',
  'milk_and_early_solids',
  'complementary_feeding',
  'family_food',
  'custom',
] as const;

/**
 * Sugerencia por edad, solo para proponer en un formulario.
 *
 * No es una recomendación clínica ni un calendario de introducción: es el
 * valor que la interfaz deja preseleccionado para que la familia lo confirme
 * o lo cambie.
 */
export function suggestStageFromAge(birthDate: string | null, now = new Date()): FeedingStage | null {
  const edad = deriveBabyAge(birthDate, now);
  if (!edad) return null;

  if (edad.months < 6) return 'milk_only';
  if (edad.months < 9) return 'milk_and_early_solids';
  if (edad.months < 12) return 'complementary_feeding';
  return 'family_food';
}

/**
 * Etapa efectiva del bebé.
 *
 * Orden de prioridad:
 *   1. la etapa que la familia eligió,
 *   2. si no hay etapa pero sí respuesta sobre sólidos, se deriva de ahí,
 *   3. si no hay nada, no se inventa: devuelve null y la interfaz pregunta.
 */
export function resolveStage(baby: Pick<Baby, 'feeding_stage' | 'solids_started'>): FeedingStage | null {
  if (baby.feeding_stage) return baby.feeding_stage;
  if (baby.solids_started) return 'complementary_feeding';
  return null;
}

/** ¿La interfaz debe dar protagonismo a los sólidos? */
export function showsSolids(baby: Pick<Baby, 'feeding_stage' | 'solids_started'>): boolean {
  // La respuesta explícita basta por sí sola, aunque la etapa diga otra cosa.
  if (baby.solids_started) return true;

  const etapa = resolveStage(baby);
  return etapa === 'milk_and_early_solids' || etapa === 'complementary_feeding' || etapa === 'family_food';
}

export type QuickLogAction =
  | 'breastfeed'
  | 'formula'
  | 'pumped_milk'
  | 'food'
  | 'diaper'
  | 'symptom'
  | 'medication';

/** Acciones que se muestran de primeras, en orden. El resto va en "Más". */
const PRIMARIAS_LECHE: QuickLogAction[] = [
  'breastfeed',
  'formula',
  'pumped_milk',
  'diaper',
  'symptom',
  'medication',
];

const PRIMARIAS_SOLIDOS: QuickLogAction[] = [
  'food',
  'breastfeed',
  'diaper',
  'symptom',
  'medication',
];

const TODAS: QuickLogAction[] = [
  'food',
  'breastfeed',
  'formula',
  'pumped_milk',
  'diaper',
  'symptom',
  'medication',
];

/**
 * Ordena el registro rápido según la etapa.
 *
 * Nunca se esconde nada: lo que no sale de primeras está en "Más". Una madre
 * cuyo bebé aún no come sólidos no debería tropezar con "Comida" cada vez, y
 * una que ya los da no debería buscarla.
 */
export function quickLogActions(
  baby: Pick<Baby, 'feeding_stage' | 'solids_started' | 'breastfeeding' | 'formula' | 'pumped_milk'> | null,
): { primary: QuickLogAction[]; more: QuickLogAction[] } {
  if (!baby) {
    return { primary: PRIMARIAS_SOLIDOS, more: TODAS.filter((a) => !PRIMARIAS_SOLIDOS.includes(a)) };
  }

  const base = showsSolids(baby) ? PRIMARIAS_SOLIDOS : PRIMARIAS_LECHE;

  // Si la familia no usa fórmula ni leche extraída, esas acciones pasan a
  // "Más": ocupan sitio sin aportar.
  const primary = base.filter((accion) => {
    if (accion === 'formula') return baby.formula;
    if (accion === 'pumped_milk') return baby.pumped_milk;
    return true;
  });

  return { primary, more: TODAS.filter((accion) => !primary.includes(accion)) };
}
