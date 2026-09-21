import { z } from 'zod';

import { nonEmptyText, uuidSchema } from './common';

export const createHouseholdSchema = z.object({
  name: nonEmptyText(120),
  locale: z.enum(['es', 'en']).default('es'),
});

export const createBabySchema = z.object({
  householdId: uuidSchema,
  name: nonEmptyText(80),
  // La edad se deriva de esta fecha; nunca se almacena (§5).
  birthDate: z.string().date().optional(),
  feedingMode: z.array(z.string().trim().min(1)).default([]),
});

export const inviteMemberSchema = z.object({
  householdId: uuidSchema,
  profileId: uuidSchema,
  role: z.enum(['owner', 'parent', 'caregiver', 'professional_viewer']),
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type CreateBabyInput = z.infer<typeof createBabySchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
