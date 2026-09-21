/**
 * Horas de silencio.
 *
 * Una madre que acaba de dormir al bebé no necesita que el móvil suene. Estas
 * funciones son puras y se prueban solas, porque de ellas depende que un aviso
 * llegue o no a las cuatro de la mañana.
 *
 * Las horas se guardan como "HH:MM" en la zona del dispositivo. Un intervalo
 * puede cruzar la medianoche (22:00 → 07:00), que es justo el caso normal.
 */

export type QuietHours = {
  start: string | null;
  end: string | null;
};

function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** ¿Cae este instante dentro de las horas de silencio? */
export function isWithinQuietHours(date: Date, quiet: QuietHours): boolean {
  if (!quiet.start || !quiet.end) return false;

  const inicio = toMinutes(quiet.start);
  const fin = toMinutes(quiet.end);
  if (inicio === null || fin === null) return false;
  if (inicio === fin) return false;

  const actual = date.getHours() * 60 + date.getMinutes();

  // Intervalo normal (09:00 → 18:00) frente a intervalo que cruza medianoche.
  return inicio < fin ? actual >= inicio && actual < fin : actual >= inicio || actual < fin;
}

/**
 * Mueve un aviso al final de las horas de silencio.
 *
 * No lo cancela: lo retrasa. Un recordatorio que la persona pidió no se tira a
 * la basura por caer de madrugada; se entrega cuando vuelve a ser buena hora.
 */
export function nextAllowedTime(date: Date, quiet: QuietHours): Date {
  if (!isWithinQuietHours(date, quiet) || !quiet.end) return date;

  const fin = toMinutes(quiet.end);
  if (fin === null) return date;

  const resultado = new Date(date);
  resultado.setSeconds(0, 0);
  resultado.setHours(Math.floor(fin / 60), fin % 60);

  // Si el final del silencio ya pasó hoy, el aviso sale mañana a esa hora.
  if (resultado <= date) {
    resultado.setDate(resultado.getDate() + 1);
  }

  return resultado;
}

/** Opciones de posposición que ofrece la interfaz, en minutos. */
export const SNOOZE_OPTIONS_MINUTES = [30, 60, 120] as const;
export type SnoozeMinutes = (typeof SNOOZE_OPTIONS_MINUTES)[number];

export function snoozeTo(from: Date, minutes: number, quiet: QuietHours): Date {
  const objetivo = new Date(from.getTime() + minutes * 60000);
  return nextAllowedTime(objetivo, quiet);
}
