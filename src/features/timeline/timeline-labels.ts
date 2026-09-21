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

/**
 * Detalle desplegable de un evento: pares etiqueta/valor, ya traducidos.
 *
 * Solo describe lo registrado. No añade lecturas ni conclusiones sobre lo que
 * significan esos datos juntos.
 */
export function timelineDetails(
  item: TimelineItem,
  translate: (key: TranslationKey) => string,
  foodName: (canonicalKey: string) => string,
): { label: string; value: string }[] {
  const { metadata } = item;
  const detalles: { label: string; value: string }[] = [];
  const añadir = (label: string, value: unknown) => {
    if (value === null || value === undefined || value === '') return;
    detalles.push({ label, value: String(value) });
  };

  switch (item.type) {
    case 'food_entry': {
      const foods = Array.isArray(metadata.foods) ? metadata.foods : [];
      for (const food of foods) {
        if (typeof food !== 'object' || food === null) continue;
        const row = food as { canonicalKey?: unknown; amountText?: unknown; isFirstExposure?: unknown };
        const nombre = foodName(String(row.canonicalKey ?? ''));
        const cantidad = row.amountText ? ` · ${String(row.amountText)}` : '';
        const primera = row.isFirstExposure === true ? ` · ${translate('food.firstExposure')}` : '';
        detalles.push({ label: nombre, value: `${cantidad}${primera}`.replace(/^ · /, '') });
      }
      if (typeof metadata.mealType === 'string') {
        añadir(translate('food.mealType'), metadata.mealType);
      }
      break;
    }
    case 'breastfeed': {
      if (typeof metadata.side === 'string') {
        const clave = `breastfeed.${metadata.side}` as TranslationKey;
        añadir(translate('quickLog.breastfeed'), translate(clave));
      }
      if (typeof metadata.durationMinutes === 'number') {
        añadir(translate('health.startedAt'), `${metadata.durationMinutes} min`);
      }
      break;
    }
    case 'diaper_event': {
      if (typeof metadata.stoolConsistency === 'string') {
        añadir(translate('diaper.consistency'), metadata.stoolConsistency);
      }
      if (typeof metadata.stoolColor === 'string') {
        añadir(translate('diaper.color'), metadata.stoolColor);
      }
      if (metadata.mucus === true) añadir(translate('diaper.mucus'), translate('common.yes'));
      if (metadata.bloodObserved === true) {
        añadir(translate('diaper.blood'), translate('common.yes'));
      }
      break;
    }
    case 'symptom': {
      if (typeof metadata.severity === 'number' && metadata.severity >= 1 && metadata.severity <= 3) {
        const clave = `health.severity${metadata.severity}` as TranslationKey;
        añadir(translate('health.severity'), translate(clave));
      }
      if (typeof metadata.endedAt === 'string') {
        añadir(translate('health.endedAt'), metadata.endedAt);
      }
      break;
    }
    case 'reaction_episode': {
      if (typeof metadata.symptomCount === 'number') {
        añadir(translate('health.symptoms'), metadata.symptomCount);
      }
      break;
    }
    case 'medication_event': {
      if (typeof metadata.doseText === 'string') añadir(translate('quickLog.dose'), metadata.doseText);
      if (typeof metadata.reasonText === 'string') {
        añadir(translate('common.notes'), metadata.reasonText);
      }
      break;
    }
    default:
      break;
  }

  if (typeof metadata.notes === 'string' && metadata.notes) {
    añadir(translate('common.notes'), metadata.notes);
  }

  return detalles;
}
