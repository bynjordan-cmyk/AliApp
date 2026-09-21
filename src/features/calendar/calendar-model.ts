import { localDayKey } from '@/lib/dates';
import type { Journey } from '@/types/domain';
import type { TimelineItem, TimelineItemType } from '@/types/timeline';

/**
 * Modelo del calendario de evolución (§2 del encargo).
 *
 * Función pura: convierte eventos y procesos en la rejilla de un mes. No
 * inventa fechas, no rellena huecos y no deduce cuánto "debería" durar nada.
 * Los hitos de un proceso son exactamente los que una persona anotó.
 */

export type CalendarLayer =
  | 'symptoms'
  | 'babyFood'
  | 'caregiverFood'
  | 'breastfeeding'
  | 'diapers'
  | 'medication';

export const CALENDAR_LAYERS: readonly CalendarLayer[] = [
  'symptoms',
  'babyFood',
  'caregiverFood',
  'breastfeeding',
  'diapers',
  'medication',
] as const;

/** Hitos de proceso. Solo los que tienen fecha registrada. */
export type JourneyMilestone = 'baseline' | 'start' | 'active' | 'review' | 'completed';

export type CalendarDay = {
  dayKey: string;
  date: Date;
  /** Día del mes que se está mostrando (no de un mes vecino). */
  inMonth: boolean;
  /** Cuántos eventos hay de cada capa activa. */
  counts: Record<CalendarLayer, number>;
  total: number;
  milestones: JourneyMilestone[];
  hasPhotos: boolean;
  hasEpisode: boolean;
};

export function layerOf(item: TimelineItem): CalendarLayer | null {
  const tipo: TimelineItemType = item.type;

  switch (tipo) {
    case 'symptom':
    case 'reaction_episode':
      return 'symptoms';
    case 'food_entry':
      return item.metadata.subjectType === 'caregiver' ? 'caregiverFood' : 'babyFood';
    case 'breastfeed':
      return 'breastfeeding';
    case 'diaper_event':
      return 'diapers';
    case 'medication_event':
      return 'medication';
    default:
      return null;
  }
}

function emptyCounts(): Record<CalendarLayer, number> {
  return {
    symptoms: 0,
    babyFood: 0,
    caregiverFood: 0,
    breastfeeding: 0,
    diapers: 0,
    medication: 0,
  };
}

/**
 * Construye la rejilla del mes, de lunes a domingo.
 *
 * `activeLayers` filtra qué se cuenta: apagar una capa la quita del recuento,
 * no la oculta a medias.
 */
export function buildMonth(
  month: Date,
  items: TimelineItem[],
  journeys: Journey[],
  activeLayers: readonly CalendarLayer[] = CALENDAR_LAYERS,
): CalendarDay[] {
  const primero = new Date(month.getFullYear(), month.getMonth(), 1);
  const ultimo = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  // La semana empieza en lunes, como en España.
  const desplazamiento = (primero.getDay() + 6) % 7;
  const inicioRejilla = new Date(primero);
  inicioRejilla.setDate(primero.getDate() - desplazamiento);

  const finDesplazamiento = (7 - ((ultimo.getDay() + 6) % 7) - 1) % 7;
  const finRejilla = new Date(ultimo);
  finRejilla.setDate(ultimo.getDate() + finDesplazamiento);

  const porDia = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const clave = localDayKey(item.occurredAt);
    const lista = porDia.get(clave);
    if (lista) lista.push(item);
    else porDia.set(clave, [item]);
  }

  const hitos = journeyMilestones(journeys);
  const dias: CalendarDay[] = [];

  for (let d = new Date(inicioRejilla); d <= finRejilla; d.setDate(d.getDate() + 1)) {
    const fecha = new Date(d);
    const dayKey = localDayKey(fecha);
    const delDia = porDia.get(dayKey) ?? [];

    const counts = emptyCounts();
    let total = 0;
    for (const item of delDia) {
      const capa = layerOf(item);
      if (!capa || !activeLayers.includes(capa)) continue;
      counts[capa] += 1;
      total += 1;
    }

    dias.push({
      dayKey,
      date: fecha,
      inMonth: fecha.getMonth() === month.getMonth(),
      counts,
      total,
      milestones: hitos.get(dayKey) ?? [],
      hasPhotos: delDia.some((item) => hasPhotos(item)),
      hasEpisode: delDia.some((item) => item.type === 'reaction_episode'),
    });
  }

  return dias;
}

function hasPhotos(item: TimelineItem): boolean {
  const media = item.metadata.mediaCount;
  return typeof media === 'number' && media > 0;
}

/**
 * Hitos por día a partir de las fechas que la familia registró.
 *
 * `started_on` es el inicio; `review_on` la revisión; `completed_on` el cierre.
 * Los días intermedios se marcan como "periodo activo". No se inventa ninguna
 * fecha que no esté en la base.
 */
export function journeyMilestones(journeys: Journey[]): Map<string, JourneyMilestone[]> {
  const mapa = new Map<string, JourneyMilestone[]>();

  const añadir = (dayKey: string, milestone: JourneyMilestone) => {
    const actual = mapa.get(dayKey) ?? [];
    if (!actual.includes(milestone)) actual.push(milestone);
    mapa.set(dayKey, actual);
  };

  for (const journey of journeys) {
    if (!journey.started_on) continue;

    añadir(journey.started_on, 'start');

    const fin = journey.completed_on ?? journey.review_on;
    if (fin) {
      const inicio = new Date(`${journey.started_on}T00:00:00`);
      const final = new Date(`${fin}T00:00:00`);
      for (let d = new Date(inicio); d < final; d.setDate(d.getDate() + 1)) {
        añadir(localDayKey(d), 'active');
      }
    }

    if (journey.review_on) añadir(journey.review_on, 'review');
    if (journey.completed_on) añadir(journey.completed_on, 'completed');
  }

  return mapa;
}
