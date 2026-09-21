import { DEFAULT_LOCALE, resolveLocale, translate } from '@/lib/i18n';
import { en } from '@/lib/i18n/locales/en';
import { es } from '@/lib/i18n/locales/es';

describe('localización', () => {
  it('el español es el idioma por defecto', () => {
    expect(DEFAULT_LOCALE).toBe('es');
  });

  it('el catálogo en inglés cubre todas las claves del español', () => {
    const spanishKeys = Object.keys(es).sort();
    const englishKeys = Object.keys(en).sort();
    expect(englishKeys).toEqual(spanishKeys);
  });

  it('ningún texto visible queda codificado en las pantallas', () => {
    expect(translate('es', 'tabs.food')).toBe('Alimentación');
    expect(translate('en', 'tabs.food')).toBe('Food');
  });

  it('cae al español cuando falta una traducción', () => {
    expect(translate('es', 'safety.notDiagnostic')).toContain('No diagnostica');
  });

  it('normaliza etiquetas de idioma del dispositivo', () => {
    expect(resolveLocale('es-ES')).toBe('es');
    expect(resolveLocale('en_US')).toBe('en');
    expect(resolveLocale('fr-FR')).toBe('es');
    expect(resolveLocale(null)).toBe('es');
  });
});
