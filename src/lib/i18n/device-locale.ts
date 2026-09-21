import { getLocales } from 'expo-localization';

import { DEFAULT_LOCALE, resolveLocale, type SupportedLocale } from './translate';

/**
 * Único punto del código que lee el idioma del dispositivo. Aislado aquí para
 * que la capa de traducción siga siendo pura y comprobable sin React Native.
 */
export function getDeviceLocale(): SupportedLocale {
  try {
    const [primary] = getLocales();
    return resolveLocale(primary?.languageTag ?? DEFAULT_LOCALE);
  } catch {
    return DEFAULT_LOCALE;
  }
}
