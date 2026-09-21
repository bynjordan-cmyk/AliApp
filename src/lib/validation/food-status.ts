import { z } from 'zod';

import { uuidSchema } from './common';

/**
 * Cambio de estado de un alimento.
 *
 * `statusSource` no admite 'system_summary': el sistema puede mantener
 * contadores y fechas, pero un estado siempre lo fija una persona (§5, §10).
 * La base lo impone además con un trigger, para que la regla no viva solo en
 * el frontend (§27).
 */
export const setFoodStatusSchema = z.object({
  babyId: uuidSchema,
  foodId: uuidSchema,
  status: z.enum([
    'unknown',
    'introducing',
    'observing',
    'tolerated',
    'avoid',
    'professional_supervision',
  ]),
  statusSource: z.enum(['family', 'professional_plan']).default('family'),
});

export type SetFoodStatusInput = z.infer<typeof setFoodStatusSchema>;
