import type { Exposure } from '@/types/domain';

/**
 * Ventanas temporales del Reaction Builder.
 *
 * MUY IMPORTANTE: una ventana es un FILTRO DE CONSULTA, no una afirmación
 * médica. "6 h" significa "enséñame lo registrado en las 6 horas previas", no
 * "lo de las últimas 6 horas es la causa". AliApp no establece relaciones
 * causa-efecto entre un alimento y un síntoma (§10).
 */

export const EXPOSURE_WINDOWS_HOURS = [6, 12, 24] as const;
export type ExposureWindowHours = (typeof EXPOSURE_WINDOWS_HOURS)[number];

export type ExposureCandidate = {
  exposure: Exposure;
  /** Minutos entre la exposición y el síntoma. Siempre >= 0. */
  minutesBefore: number;
};

/**
 * Filtra exposiciones anteriores a un instante y calcula cuánto antes
 * ocurrieron. Ordena de la más cercana al síntoma a la más lejana, que es el
 * orden en el que una persona las revisa.
 */
export function candidatesWithinWindow(
  exposures: Exposure[],
  symptomAt: string,
  windowHours: ExposureWindowHours,
): ExposureCandidate[] {
  const referencia = new Date(symptomAt).getTime();
  const limite = referencia - windowHours * 60 * 60 * 1000;

  return exposures
    .filter((exposure) => {
      const momento = new Date(exposure.occurred_at).getTime();
      return momento <= referencia && momento >= limite;
    })
    .map((exposure) => ({
      exposure,
      minutesBefore: Math.round((referencia - new Date(exposure.occurred_at).getTime()) / 60000),
    }))
    .sort((a, b) => a.minutesBefore - b.minutesBefore);
}

/**
 * Describe la distancia temporal en palabras.
 *
 * Frase permitida: "Esta exposición ocurrió 3 h 20 min antes del síntoma."
 * Frase prohibida: cualquiera que insinúe que una cosa provocó la otra.
 */
export function describeInterval(
  minutesBefore: number,
  labels: { hoursShort: string; minutesShort: string; before: string },
): string {
  const horas = Math.floor(minutesBefore / 60);
  const minutos = minutesBefore % 60;

  const duracion =
    horas === 0
      ? `${minutos} ${labels.minutesShort}`
      : minutos === 0
        ? `${horas} ${labels.hoursShort}`
        : `${horas} ${labels.hoursShort} ${minutos} ${labels.minutesShort}`;

  return `${duracion} ${labels.before}`;
}
