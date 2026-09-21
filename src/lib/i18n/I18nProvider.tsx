import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { getDeviceLocale } from './device-locale';
import type { TranslationKey } from './keys';
import {
  DEFAULT_LOCALE,
  translate,
  type SupportedLocale,
  type TranslateParams,
} from './translate';

type I18nContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: TranslationKey, params?: TranslateParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * El lanzamiento de AliApp es en español: ese es el idioma por defecto aunque
 * el dispositivo esté en otro. La arquitectura ya soporta más idiomas y la
 * usuaria puede cambiarlo en Perfil.
 *
 * Cuando el producto se abra a otros mercados, basta con activar esta bandera
 * para que el idioma del dispositivo mande en el primer arranque.
 */
const FOLLOW_DEVICE_LOCALE = false;

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    if (initialLocale) return initialLocale;
    return FOLLOW_DEVICE_LOCALE ? getDeviceLocale() : DEFAULT_LOCALE;
  });

  const t = useCallback(
    (key: TranslationKey, params?: TranslateParams) => translate(locale, key, params),
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  }
  return context;
}

/** Atajo para componentes que solo necesitan traducir. */
export function useT() {
  return useI18n().t;
}
