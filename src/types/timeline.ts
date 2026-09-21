import type { Json } from '@/lib/supabase/database.types';
import type { TranslationKey } from '@/lib/i18n';

/**
 * Forma normalizada de la línea de tiempo (§16).
 *
 * `title` no es texto: es una clave de traducción. El idioma se resuelve en la
 * capa de presentación, de modo que el mismo evento sirve para la UI y para un
 * futuro informe en otro idioma (§20).
 */
export type TimelineItemType =
  | 'food_entry'
  | 'breastfeed'
  | 'diaper_event'
  | 'symptom'
  | 'reaction_episode'
  | 'medication_event';

export type TimelineItem = {
  id: string;
  type: TimelineItemType;
  occurredAt: string;
  /** Clave de traducción del título ('timeline.symptom', …). */
  title: TranslationKey;
  /** Subtítulo ya resuelto, o null si no aplica. */
  subtitle: string | null;
  /** Perfil que registró el evento. */
  actor: string | null;
  metadata: Record<string, Json | undefined>;
  sourceTable: string;
};

export type TimelineDay = {
  dayKey: string;
  items: TimelineItem[];
};
