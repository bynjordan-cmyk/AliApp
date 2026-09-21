import type { TranslationKey } from '@/lib/i18n';
import type { EventRevision } from '@/types/domain';

/**
 * Historial de correcciones, en lenguaje de persona.
 *
 * Lo que la base guarda es una diferencia cruda por columna. Aquí se convierte
 * en algo legible —"hora del registro", "cantidad"— sin juzgar el cambio ni
 * llamarlo corrección de un error. Alguien anotó mejor lo que pasó; ya está.
 *
 * Módulo puro: entra una fila, sale una descripción.
 */

export type RevisionFieldChange = {
  column: string;
  /** Clave de traducción del campo, o null si es una columna sin nombre visible. */
  labelKey: TranslationKey | null;
  from: unknown;
  to: unknown;
};

export type RevisionEntry = {
  id: string;
  changedAt: string;
  changedBy: string | null;
  kind: 'edit' | 'delete';
  fields: RevisionFieldChange[];
};

/**
 * Nombre visible de cada columna editable.
 *
 * Lo que no está aquí no se pinta: es fontanería (ids, marcas de tiempo
 * internas) y enseñarla solo añade ruido.
 */
const LABEL_BY_COLUMN: Record<string, TranslationKey> = {
  occurred_at: 'record.field.occurredAt',
  started_at: 'record.field.startedAt',
  ended_at: 'record.field.endedAt',
  notes: 'common.notes',
  severity: 'health.severity',
  symptom_type: 'record.field.symptomType',
  diaper_type: 'diaper.type',
  stool_consistency: 'diaper.consistency',
  stool_color: 'diaper.color',
  stool_amount: 'diaper.amount',
  mucus: 'diaper.mucus',
  blood_observed: 'diaper.blood',
  visible_food_residue: 'diaper.foodResidue',
  straining: 'diaper.straining',
  unusual_odor: 'diaper.odor',
  feed_kind: 'record.field.feedKind',
  side: 'record.field.side',
  amount_ml: 'record.field.amountMl',
  brand: 'record.field.brand',
  meal_type: 'food.mealType',
  name: 'record.field.name',
  dose_text: 'quickLog.dose',
  reason_text: 'record.field.reason',
  status: 'record.field.status',
};

export function revisionFieldLabelKey(column: string): TranslationKey | null {
  return LABEL_BY_COLUMN[column] ?? null;
}

type ChangePair = { from?: unknown; to?: unknown };

/**
 * Convierte una fila de `event_revisions` en algo que se pueda leer.
 *
 * Deja fuera las columnas sin nombre visible y ordena los campos por su nombre
 * de columna, para que dos ediciones iguales se cuenten igual.
 */
export function describeRevision(row: EventRevision): RevisionEntry {
  const changes = (row.changes ?? {}) as Record<string, ChangePair>;

  const fields = Object.entries(changes)
    .filter(([column]) => column !== 'deleted_at')
    .map(([column, pair]) => ({
      column,
      labelKey: revisionFieldLabelKey(column),
      from: pair?.from ?? null,
      to: pair?.to ?? null,
    }))
    .filter((field) => field.labelKey !== null)
    .sort((a, b) => a.column.localeCompare(b.column));

  return {
    id: row.id,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
    kind: row.kind === 'delete' ? 'delete' : 'edit',
    fields,
  };
}

/**
 * ¿Hay que pintar el sello "Editado"?
 *
 * Discreto a propósito: es una marca de transparencia, no una acusación. Un
 * registro creado y nunca tocado no lleva nada.
 */
export function wasEdited(row: { edited_at?: string | null } | null | undefined): boolean {
  return Boolean(row?.edited_at);
}
