import { z } from 'zod';

import { optionalNotesSchema, uuidSchema } from './common';

/**
 * Un proceso organiza datos; no sustituye a los eventos ni impone calendarios
 * clínicos. No hay duraciones por defecto codificadas (§12).
 */
export const journeyTargetSchema = z.object({
  foodId: uuidSchema,
  targetSubject: z.enum(['baby', 'caregiver']),
  action: z.enum(['avoid', 'introduce', 'maintain', 'observe']),
});

export const createJourneySchema = z
  .object({
    householdId: uuidSchema,
    babyId: uuidSchema,
    journeyType: z.enum([
      'tracking',
      'introduction',
      'observation',
      'exclusion',
      'reintroduction',
      'known_allergy',
    ]),
    status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).default('draft'),
    startedOn: z.string().date(),
    reviewOn: z.string().date().optional(),
    indicatedBy: z.enum(['family', 'pediatrician', 'allergist', 'dietitian', 'other']),
    professionalName: z.string().trim().max(160).optional(),
    notes: optionalNotesSchema,
    targets: z.array(journeyTargetSchema).default([]),
  })
  .refine((value) => !value.reviewOn || value.reviewOn >= value.startedOn, {
    message: 'La fecha de revisión no puede ser anterior al inicio',
    path: ['reviewOn'],
  })
  .refine(
    (value) => value.journeyType !== 'exclusion' || value.targets.length > 0,
    {
      message: 'Un proceso de exclusión necesita al menos un alimento',
      path: ['targets'],
    },
  );

export type CreateJourneyInput = z.infer<typeof createJourneySchema>;
export type JourneyTargetInput = z.infer<typeof journeyTargetSchema>;
