import type { TranslationKey } from '@/lib/i18n';
import type { TimelineItem } from '@/types/timeline';

/**
 * Traducción de los valores que la línea de tiempo guarda como claves estables.
 *
 * El dato en base es una clave ('urine', 'skin_rash'): es lo correcto para
 * almacenar y para un informe en cualquier idioma. El texto visible se resuelve
 * aquí, en la capa de presentación.
 */

const DIAPER_KEYS: Record<string, TranslationKey> = {
  urine: 'diaper.urine',
  stool: 'diaper.stool',
  both: 'diaper.both',
};

const SYMPTOM_KEYS: Record<string, TranslationKey> = {
  skin_rash: 'symptom.skin_rash',
  vomiting: 'symptom.vomiting',
  diarrhea: 'symptom.diarrhea',
  irritability: 'symptom.irritability',
  cough: 'symptom.cough',
  congestion: 'symptom.congestion',
  swelling: 'symptom.swelling',
  other: 'symptom.other',
};

export function diaperTypeKey(value: string): TranslationKey | null {
  return DIAPER_KEYS[value] ?? null;
}

export function symptomTypeKey(value: string): TranslationKey | null {
  return SYMPTOM_KEYS[value] ?? null;
}

/**
 * Subtítulo legible de un elemento de la línea de tiempo.
 *
 * `translate` resuelve claves de texto y `foodName` claves de alimento. Si algo
 * no se reconoce se muestra el valor tal cual: es preferible un dato crudo a
 * ocultar lo que la familia registró.
 */
export function timelineSubtitle(
  item: TimelineItem,
  translate: (key: TranslationKey) => string,
  foodName: (canonicalKey: string) => string,
): string | null {
  const { metadata } = item;

  switch (item.type) {
    case 'food_entry': {
      const foods = metadata.foods;
      if (!Array.isArray(foods) || foods.length === 0) return null;
      return foods
        .map((food) =>
          typeof food === 'object' && food !== null && 'canonicalKey' in food
            ? foodName(String((food as { canonicalKey: unknown }).canonicalKey))
            : '',
        )
        .filter(Boolean)
        .join(', ');
    }
    case 'diaper_event': {
      if (typeof metadata.diaperType !== 'string') return null;
      const key = diaperTypeKey(metadata.diaperType);
      return key ? translate(key) : metadata.diaperType;
    }
    case 'symptom': {
      if (typeof metadata.symptomType !== 'string') return null;
      const key = symptomTypeKey(metadata.symptomType);
      const label = key ? translate(key) : metadata.symptomType;
      const severity = metadata.severity;
      if (severity === 1 || severity === 2 || severity === 3) {
        const severityKey = `health.severity${severity}` as TranslationKey;
        return `${label} · ${translate(severityKey)}`;
      }
      return label;
    }
    case 'reaction_episode': {
      if (metadata.status === 'open') return translate('health.episodeOpen');
      if (metadata.status === 'resolved') return translate('health.episodeResolved');
      return null;
    }
    case 'breastfeed':
      return typeof metadata.durationMinutes === 'number'
        ? `${metadata.durationMinutes} min`
        : null;
    case 'medication_event':
      return typeof metadata.name === 'string' ? metadata.name : null;
    default:
      return null;
  }
}
