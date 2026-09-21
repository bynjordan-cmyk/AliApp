import type { TimelineItem } from '@/types/timeline';

/**
 * Cruce "qué comió antes" (§5 del encargo).
 *
 * Reúne lo registrado en las horas previas a una deposición y calcula el
 * intervalo. ESO ES TODO lo que hace.
 *
 * Frase válida:   "Se registró maíz 5 h 40 min antes de esta deposición."
 * Frase inválida: "El maíz causó estos restos."
 *
 * Por eso esta función devuelve hechos con su intervalo y nunca un orden por
 * "sospecha", ni marca nada como probable.
 */

export const CROSS_LOG_WINDOWS_HOURS = [6, 12, 24] as const;
export type CrossLogWindowHours = (typeof CROSS_LOG_WINDOWS_HOURS)[number];

/** Separamos lo que comió el bebé de lo que comió la madre: son vías distintas. */
export type CrossLogSubject = 'baby' | 'caregiver';

export type CrossLogEntry = {
  item: TimelineItem;
  minutesBefore: number;
  subject: CrossLogSubject;
};

const TIPOS_ALIMENTARIOS: TimelineItem['type'][] = ['food_entry', 'breastfeed'];

export function buildCrossLog(
  items: TimelineItem[],
  diaperAt: string,
  windowHours: CrossLogWindowHours,
): CrossLogEntry[] {
  const referencia = new Date(diaperAt).getTime();
  const limite = referencia - windowHours * 60 * 60 * 1000;

  return items
    .filter((item) => TIPOS_ALIMENTARIOS.includes(item.type))
    .filter((item) => {
      const momento = new Date(item.occurredAt).getTime();
      return momento < referencia && momento >= limite;
    })
    .map((item) => ({
      item,
      minutesBefore: Math.round((referencia - new Date(item.occurredAt).getTime()) / 60000),
      subject: (item.metadata.subjectType === 'caregiver' ? 'caregiver' : 'baby') as CrossLogSubject,
    }))
    .sort((a, b) => a.minutesBefore - b.minutesBefore);
}

/** Agrupa por sujeto para poder mostrar al bebé y a la madre por separado. */
export function groupBySubject(entries: CrossLogEntry[]): Record<CrossLogSubject, CrossLogEntry[]> {
  return {
    baby: entries.filter((entry) => entry.subject === 'baby'),
    caregiver: entries.filter((entry) => entry.subject === 'caregiver'),
  };
}
