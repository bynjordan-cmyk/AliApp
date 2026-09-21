import type { Journey, Reminder } from '@/types/domain';
import type { TimelineItem } from '@/types/timeline';

/**
 * Resumen del día en datos estructurados (§7 del encargo).
 *
 * La interfaz consume este objeto; mañana lo podrá consumir Ali Insights. Por
 * eso es una función PURA, sin React y sin base de datos.
 *
 * Lo que devuelve son hechos contados: cuántas tomas, a qué hora fue la
 * última, cuántos síntomas. Lo que NO devuelve, ni devolverá: causas,
 * diagnósticos, valoraciones de si algo va bien o mal, ni puntuación alguna.
 */

export type FeedingSummary = {
  breastfeeds: number;
  /** Minutos sumados de las tomas con hora de fin. */
  breastfeedMinutes: number;
  babyMeals: number;
  caregiverMeals: number;
  /** Instante de la última toma o comida del bebé, si hubo alguna. */
  lastFeedAt: string | null;
  firstExposures: number;
};

export type HealthSummary = {
  symptoms: number;
  openEpisodes: number;
  medications: number;
  /** Instante del último síntoma registrado, si hubo alguno. */
  lastSymptomAt: string | null;
};

export type DiaperSummary = {
  total: number;
  stool: number;
  urine: number;
  withBlood: number;
  withMucus: number;
  lastAt: string | null;
};

export type DailySummary = {
  dayKey: string;
  /** Instante en que se calculó, para que la interfaz no lea el reloj al pintar. */
  generatedAt: string;
  feeding: FeedingSummary;
  health: HealthSummary;
  diapers: DiaperSummary;
  photos: number;
  activeJourneys: Journey[];
  upcomingReminders: Reminder[];
  totalRecords: number;
};

export type DailySummaryInput = {
  dayKey: string;
  items: TimelineItem[];
  journeys: Journey[];
  reminders: Reminder[];
  /** Momento de referencia para saber qué recordatorios están por venir. */
  now?: Date;
};

function ultimoInstante(items: TimelineItem[]): string | null {
  if (items.length === 0) return null;
  return items
    .map((item) => item.occurredAt)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] as string;
}

export function buildDailySummary({
  dayKey,
  items,
  journeys,
  reminders,
  now = new Date(),
}: DailySummaryInput): DailySummary {
  const de = (tipo: TimelineItem['type']) => items.filter((item) => item.type === tipo);

  const tomas = de('breastfeed');
  const comidas = de('food_entry');
  const comidasBebe = comidas.filter((item) => item.metadata.subjectType !== 'caregiver');
  const comidasCuidador = comidas.filter((item) => item.metadata.subjectType === 'caregiver');
  const sintomas = de('symptom');
  const episodios = de('reaction_episode');
  const panales = de('diaper_event');

  const minutosDeTomas = tomas.reduce((total, item) => {
    const duracion = item.metadata.durationMinutes;
    return total + (typeof duracion === 'number' ? duracion : 0);
  }, 0);

  const primerasVeces = comidasBebe.reduce((total, item) => {
    const foods = item.metadata.foods;
    if (!Array.isArray(foods)) return total;
    return (
      total +
      foods.filter(
        (food) =>
          typeof food === 'object' &&
          food !== null &&
          (food as { isFirstExposure?: unknown }).isFirstExposure === true,
      ).length
    );
  }, 0);

  const fotos = items.reduce((total, item) => {
    const cuenta = item.metadata.mediaCount;
    return total + (typeof cuenta === 'number' ? cuenta : 0);
  }, 0);

  const deposiciones = panales.filter(
    (item) => item.metadata.diaperType === 'stool' || item.metadata.diaperType === 'both',
  );

  return {
    dayKey,
    generatedAt: now.toISOString(),
    feeding: {
      breastfeeds: tomas.length,
      breastfeedMinutes: minutosDeTomas,
      babyMeals: comidasBebe.length,
      caregiverMeals: comidasCuidador.length,
      lastFeedAt: ultimoInstante([...tomas, ...comidasBebe]),
      firstExposures: primerasVeces,
    },
    health: {
      symptoms: sintomas.length,
      openEpisodes: episodios.filter((item) => item.metadata.status === 'open').length,
      medications: de('medication_event').length,
      lastSymptomAt: ultimoInstante(sintomas),
    },
    diapers: {
      total: panales.length,
      stool: deposiciones.length,
      urine: panales.filter((item) => item.metadata.diaperType === 'urine').length,
      withBlood: panales.filter((item) => item.metadata.bloodObserved === true).length,
      withMucus: panales.filter((item) => item.metadata.mucus === true).length,
      lastAt: ultimoInstante(panales),
    },
    photos: fotos,
    activeJourneys: journeys.filter((journey) => journey.status === 'active'),
    upcomingReminders: reminders
      .filter((reminder) => reminder.status === 'scheduled')
      .filter((reminder) => new Date(reminder.scheduled_for).getTime() >= now.getTime())
      .sort(
        (a, b) =>
          new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime(),
      ),
    totalRecords: items.length,
  };
}
