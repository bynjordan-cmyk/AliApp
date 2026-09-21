import { z } from 'zod';

import { nonEmptyText, occurredAtSchema, uuidSchema } from './common';

/**
 * Esquemas de CORRECCIÓN.
 *
 * Premisa: el registro inicial casi nunca es perfecto. Quien registra a las
 * cuatro de la mañana guarda lo mínimo y vuelve luego, con la cabeza más
 * clara, a poner la hora exacta, la cantidad o una nota.
 *
 * Por eso todos los campos son opcionales y `null` es un valor legítimo: no es
 * "sin dato", es "bórralo, me equivoqué". Se distingue de `undefined`, que
 * significa "esto no lo estoy tocando".
 *
 * `occurredAt` SÍ se puede corregir. Es justo lo que más se equivoca alguien
 * que registra media hora después, y nunca se sustituye por `created_at` (§8).
 */

/** `null` borra el dato; omitirlo lo deja como estaba. */
const nullableText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

const nullableBoolean = z.boolean().nullable().optional();

export const foodEntryPatchSchema = z.object({
  occurredAt: occurredAtSchema.optional(),
  mealType: z.enum(['breakfast', 'lunch', 'snack', 'dinner', 'other']).nullable().optional(),
  notes: nullableText(2000),
  /** Si se envía, sustituye por completo la lista de alimentos del registro. */
  items: z
    .array(
      z.object({
        foodId: uuidSchema,
        amountText: nullableText(120),
        isFirstExposure: z.boolean().default(false),
      }),
    )
    .min(1, 'Deja al menos un alimento')
    .optional(),
});

export const breastfeedPatchSchema = z
  .object({
    startedAt: occurredAtSchema.optional(),
    /** `null` reabre una toma que se cerró por error. */
    endedAt: occurredAtSchema.nullable().optional(),
    feedKind: z.enum(['breast', 'formula', 'pumped_milk']).optional(),
    side: z.enum(['left', 'right', 'both']).nullable().optional(),
    amountMl: z.number().int().min(1).max(1000).nullable().optional(),
    brand: nullableText(120),
    notes: nullableText(2000),
  })
  .refine(
    (value) =>
      !value.endedAt ||
      !value.startedAt ||
      new Date(value.endedAt) >= new Date(value.startedAt),
    { message: 'La toma no puede terminar antes de empezar', path: ['endedAt'] },
  )
  // El lado solo describe una toma de pecho; la base tiene la misma regla.
  .refine((value) => !(value.feedKind && value.feedKind !== 'breast' && value.side), {
    message: 'El lado solo se registra en una toma de pecho',
    path: ['side'],
  });

export const diaperEventPatchSchema = z.object({
  occurredAt: occurredAtSchema.optional(),
  diaperType: z.enum(['urine', 'stool', 'both']).optional(),
  stoolConsistency: nullableText(60),
  stoolColor: nullableText(60),
  stoolAmount: z.enum(['scant', 'moderate', 'large']).nullable().optional(),
  mucus: nullableBoolean,
  bloodObserved: nullableBoolean,
  visibleFoodResidue: nullableBoolean,
  straining: nullableBoolean,
  unusualOdor: nullableBoolean,
  notes: nullableText(2000),
});

export const symptomPatchSchema = z
  .object({
    symptomType: z.string().regex(/^[a-z0-9_]+$/, 'Clave de síntoma no válida').optional(),
    startedAt: occurredAtSchema.optional(),
    endedAt: occurredAtSchema.nullable().optional(),
    severity: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
    notes: nullableText(2000),
  })
  .refine(
    (value) =>
      !value.endedAt ||
      !value.startedAt ||
      new Date(value.endedAt) >= new Date(value.startedAt),
    { message: 'El síntoma no puede terminar antes de empezar', path: ['endedAt'] },
  );

export const reactionEpisodePatchSchema = z.object({
  startedAt: occurredAtSchema.optional(),
  endedAt: occurredAtSchema.nullable().optional(),
  status: z.enum(['open', 'resolved']).optional(),
  notes: nullableText(2000),
});

export const medicationEventPatchSchema = z.object({
  name: nonEmptyText(160).optional(),
  // Texto libre. AliApp sigue sin proponer ninguna dosis (§10).
  doseText: nullableText(120),
  occurredAt: occurredAtSchema.optional(),
  reasonText: nullableText(240),
  notes: nullableText(2000),
});

export type FoodEntryPatch = z.infer<typeof foodEntryPatchSchema>;
export type BreastfeedPatch = z.infer<typeof breastfeedPatchSchema>;
export type DiaperEventPatch = z.infer<typeof diaperEventPatchSchema>;
export type SymptomPatch = z.infer<typeof symptomPatchSchema>;
export type ReactionEpisodePatch = z.infer<typeof reactionEpisodePatchSchema>;
export type MedicationEventPatch = z.infer<typeof medicationEventPatchSchema>;

/**
 * Convierte un parche de la app en las columnas de la base.
 *
 * Solo viajan las claves presentes: lo que nadie tocó no se sobrescribe, y así
 * dos personas que corrigen campos distintos no se pisan.
 */
export function toColumnPatch<TPatch extends object, TRow extends object = Record<string, unknown>>(
  patch: TPatch,
  columns: { [K in keyof TPatch]?: keyof TRow & string },
): Partial<TRow> {
  const row: Record<string, unknown> = {};

  for (const [key, column] of Object.entries(columns) as [keyof TPatch, string][]) {
    if (key in patch && patch[key] !== undefined) {
      row[column] = patch[key];
    }
  }

  return row as Partial<TRow>;
}
