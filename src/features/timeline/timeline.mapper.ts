import { localDayKey } from '@/lib/dates';
import type { TranslationKey } from '@/lib/i18n';
import type { TimelineEventRow } from '@/types/domain';
import type { TimelineDay, TimelineItem, TimelineItemType } from '@/types/timeline';

/**
 * Normalización de la línea de tiempo (§16). Función pura: se puede probar sin
 * base de datos y reutilizar en informes.
 */

const TITLE_KEYS: Record<TimelineItemType, TranslationKey> = {
  food_entry: 'timeline.foodEntry',
  breastfeed: 'timeline.breastfeed',
  diaper_event: 'timeline.diaper',
  symptom: 'timeline.symptom',
  reaction_episode: 'timeline.episode',
  medication_event: 'timeline.medication',
};

function isTimelineType(value: string): value is TimelineItemType {
  return value in TITLE_KEYS;
}

export function mapTimelineRow(row: TimelineEventRow): TimelineItem | null {
  if (!row.id || !row.type || !row.occurred_at || !isTimelineType(row.type)) {
    return null;
  }

  const metadata = (row.metadata ?? {}) as TimelineItem['metadata'];

  return {
    id: row.id,
    type: row.type,
    occurredAt: row.occurred_at,
    title: TITLE_KEYS[row.type],
    subtitle: buildSubtitle(row.type, metadata),
    actor: row.actor_profile_id ?? null,
    metadata,
    sourceTable: row.source_table ?? '',
  };
}

/**
 * Subtítulo factual y corto. Describe lo registrado, nunca lo interpreta.
 * Devuelve claves/valores crudos; el idioma se aplica en la capa de UI.
 */
function buildSubtitle(
  type: TimelineItemType,
  metadata: TimelineItem['metadata'],
): string | null {
  switch (type) {
    case 'food_entry': {
      const foods = metadata.foods;
      if (!Array.isArray(foods) || foods.length === 0) return null;
      return foods
        .map((food) =>
          typeof food === 'object' && food !== null && 'canonicalKey' in food
            ? String((food as { canonicalKey: unknown }).canonicalKey)
            : '',
        )
        .filter(Boolean)
        .join(', ');
    }
    case 'breastfeed': {
      const duration = metadata.durationMinutes;
      return typeof duration === 'number' ? `${duration} min` : null;
    }
    case 'diaper_event':
      return typeof metadata.diaperType === 'string' ? metadata.diaperType : null;
    case 'symptom':
      return typeof metadata.symptomType === 'string' ? metadata.symptomType : null;
    case 'reaction_episode':
      return typeof metadata.status === 'string' ? metadata.status : null;
    case 'medication_event':
      return typeof metadata.name === 'string' ? metadata.name : null;
    default:
      return null;
  }
}

/**
 * Ordena por `occurred_at` ascendente o descendente.
 *
 * Es `occurred_at`, nunca `created_at`: un registro hecho en diferido cae en su
 * lugar real de la historia (§8).
 */
export function sortByOccurredAt(
  items: TimelineItem[],
  direction: 'asc' | 'desc' = 'desc',
): TimelineItem[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...items].sort(
    (a, b) => factor * (new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()),
  );
}

/** Agrupa por día local para pintar la línea de tiempo. */
export function groupByDay(items: TimelineItem[]): TimelineDay[] {
  const groups = new Map<string, TimelineItem[]>();

  for (const item of sortByOccurredAt(items, 'desc')) {
    const key = localDayKey(item.occurredAt);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return [...groups.entries()]
    .map(([dayKey, dayItems]) => ({ dayKey, items: dayItems }))
    .sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
}
