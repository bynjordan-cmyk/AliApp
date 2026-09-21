import { z } from 'zod';

import { nonEmptyText, occurredAtSchema, optionalNotesSchema, uuidSchema } from './common';

/**
 * Esquemas de los formularios de registro.
 *
 * Regla de producto (§15): el mínimo obligatorio es diminuto y todo lo
 * clínico/contextual es opcional, para que una toma se registre en segundos.
 *
 * Regla de seguridad (§27): un síntoma NUNCA lleva el alimento sospechoso.
 * Relacionar síntoma y exposición es un paso posterior y explícito.
 */

export const foodEntryItemSchema = z.object({
  foodId: uuidSchema,
  amountText: z.string().trim().max(120).optional(),
  isFirstExposure: z.boolean().default(false),
});

export const babyFoodEntrySchema = z.object({
  babyId: uuidSchema,
  occurredAt: occurredAtSchema,
  mealType: z.enum(['breakfast', 'lunch', 'snack', 'dinner', 'other']).optional(),
  items: z.array(foodEntryItemSchema).min(1, 'Añade al menos un alimento'),
  notes: optionalNotesSchema,
});

export const caregiverFoodEntrySchema = z.object({
  caregiverProfileId: uuidSchema,
  babyId: uuidSchema.optional(),
  occurredAt: occurredAtSchema,
  mealType: z.enum(['breakfast', 'lunch', 'snack', 'dinner', 'other']).optional(),
  items: z.array(foodEntryItemSchema).min(1, 'Añade al menos un alimento'),
  notes: optionalNotesSchema,
});

/**
 * Toma de leche: pecho, fórmula o leche extraída.
 *
 * El mínimo es la vía y la hora. Cantidad, marca y hora de fin se pueden
 * completar después, desde el detalle del registro (§15).
 */
export const breastfeedSchema = z
  .object({
    babyId: uuidSchema,
    startedAt: occurredAtSchema,
    endedAt: occurredAtSchema.optional(),
    feedKind: z.enum(['breast', 'formula', 'pumped_milk']).default('breast'),
    side: z.enum(['left', 'right', 'both']).optional(),
    /** Cantidad observada. AliApp nunca sugiere cuánto debe tomar un bebé (§10). */
    amountMl: z.number().int().min(1).max(1000).optional(),
    brand: z.string().trim().max(120).optional(),
    feedingParentProfileId: uuidSchema.optional(),
    notes: optionalNotesSchema,
  })
  .refine(
    (value) => !value.endedAt || new Date(value.endedAt) >= new Date(value.startedAt),
    { message: 'La toma no puede terminar antes de empezar', path: ['endedAt'] },
  )
  .refine((value) => value.feedKind === 'breast' || !value.side, {
    message: 'El lado solo se registra en una toma de pecho',
    path: ['side'],
  });

/**
 * Pañal. Todo el detalle es opcional y descriptivo: describe lo observado sin
 * interpretarlo. Ninguna combinación de campos significa nada por sí sola.
 */
export const diaperEventSchema = z.object({
  babyId: uuidSchema,
  occurredAt: occurredAtSchema,
  diaperType: z.enum(['urine', 'stool', 'both']),
  stoolConsistency: z.string().trim().max(60).optional(),
  stoolColor: z.string().trim().max(60).optional(),
  stoolAmount: z.enum(['scant', 'moderate', 'large']).optional(),
  mucus: z.boolean().optional(),
  bloodObserved: z.boolean().optional(),
  /** Restos reconocibles de comida. Es una observación, no una relación causal. */
  visibleFoodResidue: z.boolean().optional(),
  straining: z.boolean().optional(),
  unusualOdor: z.boolean().optional(),
  notes: optionalNotesSchema,
});

export const symptomSchema = z
  .object({
    babyId: uuidSchema,
    symptomType: z
      .string()
      .regex(/^[a-z0-9_]+$/, 'Clave de síntoma no válida'),
    startedAt: occurredAtSchema,
    endedAt: occurredAtSchema.optional(),
    /** Intensidad observada por la familia. No es una escala clínica. */
    severity: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    notes: optionalNotesSchema,
  })
  .refine(
    (value) => !value.endedAt || new Date(value.endedAt) >= new Date(value.startedAt),
    { message: 'El síntoma no puede terminar antes de empezar', path: ['endedAt'] },
  );

export const reactionEpisodeSchema = z.object({
  babyId: uuidSchema,
  startedAt: occurredAtSchema,
  endedAt: occurredAtSchema.optional(),
  status: z.enum(['open', 'resolved']).default('open'),
  symptomIds: z.array(uuidSchema).default([]),
  notes: optionalNotesSchema,
});

export const medicationEventSchema = z.object({
  babyId: uuidSchema,
  name: nonEmptyText(160),
  // Texto libre escrito por la familia. AliApp nunca propone dosis (§10).
  doseText: z.string().trim().max(120).optional(),
  occurredAt: occurredAtSchema,
  reasonText: z.string().trim().max(240).optional(),
  notes: optionalNotesSchema,
});

export type BabyFoodEntryInput = z.infer<typeof babyFoodEntrySchema>;
export type CaregiverFoodEntryInput = z.infer<typeof caregiverFoodEntrySchema>;
export type BreastfeedInput = z.infer<typeof breastfeedSchema>;
export type DiaperEventInput = z.infer<typeof diaperEventSchema>;
export type SymptomInput = z.infer<typeof symptomSchema>;
export type ReactionEpisodeInput = z.infer<typeof reactionEpisodeSchema>;
export type MedicationEventInput = z.infer<typeof medicationEventSchema>;
