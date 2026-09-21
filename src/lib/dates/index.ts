import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import { enUS, es } from 'date-fns/locale';

import type { SupportedLocale } from '../i18n/translate';

/**
 * Reglas de tiempo de AliApp (§8):
 * - todo se almacena en UTC (`timestamptz`),
 * - todo se muestra en la zona horaria del dispositivo,
 * - `occurred_at` (cuándo pasó) nunca se sustituye por `created_at`.
 */

const dateFnsLocales = { es, en: enUS } as const;

export function toIsoInstant(date: Date): string {
  return date.toISOString();
}

export function fromIsoInstant(value: string): Date {
  return parseISO(value);
}

export function formatTime(value: string | Date, locale: SupportedLocale = 'es'): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'HH:mm', { locale: dateFnsLocales[locale] });
}

export function formatDate(value: string | Date, locale: SupportedLocale = 'es'): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'd MMM yyyy', { locale: dateFnsLocales[locale] });
}

export function formatDayHeading(value: string | Date, locale: SupportedLocale = 'es'): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'EEEE d MMMM', { locale: dateFnsLocales[locale] });
}

/** Clave de agrupación por día local, usada por la línea de tiempo. */
export function localDayKey(value: string | Date): string {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(startOfDay(date), 'yyyy-MM-dd');
}

export function isToday(value: string | Date, now: Date = new Date()): boolean {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isSameDay(date, now);
}

export type BabyAge = {
  days: number;
  months: number;
};

/**
 * La edad siempre se deriva de `birth_date`; nunca se almacena (§5).
 * Devuelve `null` cuando no hay fecha de nacimiento registrada.
 */
export function deriveBabyAge(
  birthDate: string | null | undefined,
  now: Date = new Date(),
): BabyAge | null {
  if (!birthDate) return null;
  const birth = parseISO(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  return {
    days: differenceInCalendarDays(now, birth),
    months: differenceInCalendarMonths(now, birth),
  };
}

/** Intervalo en minutos entre dos instantes, útil para descripciones factuales. */
export function minutesBetween(from: string | Date, to: string | Date): number {
  const start = typeof from === 'string' ? parseISO(from) : from;
  const end = typeof to === 'string' ? parseISO(to) : to;
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function formatDurationMinutes(minutes: number, locale: SupportedLocale = 'es'): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const rest = Math.abs(minutes) % 60;
  const hourLabel = locale === 'es' ? 'h' : 'h';
  const minuteLabel = 'min';
  if (hours === 0) return `${rest} ${minuteLabel}`;
  if (rest === 0) return `${hours} ${hourLabel}`;
  return `${hours} ${hourLabel} ${rest} ${minuteLabel}`;
}
