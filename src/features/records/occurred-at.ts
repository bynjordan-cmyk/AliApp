import { format, isValid, parse } from 'date-fns';

/**
 * Corregir "cuándo ocurrió".
 *
 * Es la corrección más frecuente: se registra media hora después y la hora
 * que queda no es la real. Por eso la interfaz ofrece desplazamientos rápidos
 * ("hace 15 min") además de escribir una fecha, y por eso `occurred_at` es
 * editable mientras `created_at` no se toca nunca (§8).
 *
 * Todo se maneja en la zona horaria del dispositivo y se guarda en UTC.
 * Funciones puras: el reloj se pasa siempre desde fuera.
 */

export const DATE_PATTERN = 'yyyy-MM-dd';
export const TIME_PATTERN = 'HH:mm';

/** Parte un instante en la fecha y la hora locales que se editan a mano. */
export function splitLocalInstant(iso: string): { date: string; time: string } {
  const instante = new Date(iso);
  if (!isValid(instante)) return { date: '', time: '' };

  return {
    date: format(instante, DATE_PATTERN),
    time: format(instante, TIME_PATTERN),
  };
}

/**
 * Vuelve a juntar fecha y hora locales en un instante.
 * Devuelve `null` si lo escrito no es una fecha real: la interfaz lo dice y no
 * guarda nada a medias.
 */
export function joinLocalInstant(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return null;
  if (!/^\d{1,2}:\d{2}$/.test(time.trim())) return null;

  const [horas = '0', minutos = '0'] = time.trim().split(':');
  const normalizada = `${horas.padStart(2, '0')}:${minutos}`;

  const instante = parse(
    `${date.trim()} ${normalizada}`,
    `${DATE_PATTERN} ${TIME_PATTERN}`,
    new Date(),
  );

  return isValid(instante) ? instante.toISOString() : null;
}

/** Desplaza un instante. Se usa con valores negativos: "hace 15 min". */
export function shiftMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

/**
 * Margen hacia el futuro que se tolera, igual que en el esquema de validación:
 * un reloj ligeramente adelantado no debe impedir guardar.
 */
const MARGEN_FUTURO_MS = 5 * 60 * 1000;

export function isFutureInstant(iso: string, now: Date): boolean {
  return new Date(iso).getTime() > now.getTime() + MARGEN_FUTURO_MS;
}

/** Atajos que se ofrecen, en minutos hacia atrás. 0 es "ahora". */
export const QUICK_OFFSETS_MINUTES = [0, 15, 30, 60, 120] as const;
