/**
 * Descripciones factuales para la interfaz y los informes (§10).
 *
 * Módulo puro, sin acceso a datos: se puede probar y reutilizar en cualquier
 * capa. Lo que AliApp PUEDE decir: cuántas veces pasó algo, cuándo y con qué
 * intervalo. Lo que NO puede decir: qué lo causó, qué retirar, qué es seguro.
 */

export function describeExposureCount(count: number, symptomCount: number): string {
  if (count === 0) return 'Todavía no hay exposiciones registradas.';
  return `Se registraron síntomas después de ${symptomCount} de ${count} exposiciones registradas.`;
}

export function describeMedianInterval(minutes: number | null): string | null {
  if (minutes === null) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `Intervalo mediano entre estos eventos: ${hours} h ${rest} min.`;
}

/** Mediana de intervalos, en minutos. Estadística descriptiva, nada más. */
export function medianIntervalMinutes(intervals: number[]): number | null {
  if (intervals.length === 0) return null;

  const sorted = [...intervals].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? null;
  }

  const low = sorted[middle - 1];
  const high = sorted[middle];
  if (low === undefined || high === undefined) return null;
  return Math.round((low + high) / 2);
}
