/**
 * Borrado lógico de eventos de salud (§9).
 *
 * AliApp no borra historial clínico: marca `deleted_at` y las consultas lo
 * excluyen. Las políticas RLS reservan el DELETE físico a owner/parent y la
 * app no lo usa.
 */
export const SOFT_DELETABLE_TABLES = [
  'food_entries',
  'breastfeeds',
  'diaper_events',
  'symptoms',
  'reaction_episodes',
  'medication_events',
  'media_assets',
  'babies',
] as const;

export type SoftDeletableTable = (typeof SOFT_DELETABLE_TABLES)[number];

export function isSoftDeletable(table: string): table is SoftDeletableTable {
  return (SOFT_DELETABLE_TABLES as readonly string[]).includes(table);
}

/** Parche que aplica un borrado lógico. Nunca se emite un DELETE. */
export function buildSoftDeletePatch(now: Date = new Date()): { deleted_at: string } {
  return { deleted_at: now.toISOString() };
}
