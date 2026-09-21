import type { TranslationKey } from './keys';
import { en } from './locales/en';
import { es } from './locales/es';

export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'es';

const catalogues: Record<SupportedLocale, Record<TranslationKey, string>> = {
  es,
  en,
};

export type TranslateParams = Record<string, string | number>;

/**
 * Devuelve el texto de una clave. Sin dependencias de React Native, para que
 * pueda usarse en servicios, pruebas y (más adelante) en informes.
 *
 * Interpolación simple: `{nombre}` se sustituye por `params.nombre`.
 */
export function translate(
  locale: SupportedLocale,
  key: TranslationKey,
  params?: TranslateParams,
): string {
  const catalogue = catalogues[locale] ?? catalogues[DEFAULT_LOCALE];
  const fallback = catalogues[DEFAULT_LOCALE][key];
  const template = catalogue[key] ?? fallback;

  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Normaliza algo como `es-ES` o `en_US` a un idioma soportado. */
export function resolveLocale(candidate: string | null | undefined): SupportedLocale {
  if (!candidate) return DEFAULT_LOCALE;
  const language = candidate.toLowerCase().replace('_', '-').split('-')[0];
  const match = SUPPORTED_LOCALES.find((locale) => locale === language);
  return match ?? DEFAULT_LOCALE;
}
