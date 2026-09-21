/**
 * Claves de caché de TanStack Query, en un único sitio.
 *
 * Todas cuelgan del hogar o del bebé, que es como se invalidan los datos en la
 * práctica: al cambiar de bebé o al registrar un evento.
 */
export const queryKeys = {
  session: ['session'] as const,
  profile: ['profile'] as const,

  households: ['households'] as const,
  household: (householdId: string) => ['households', householdId] as const,
  householdMembers: (householdId: string) => ['households', householdId, 'members'] as const,

  babies: (householdId: string) => ['households', householdId, 'babies'] as const,
  baby: (babyId: string) => ['babies', babyId] as const,

  foods: (locale: string) => ['foods', locale] as const,

  timeline: (babyId: string, from: string, to: string) =>
    ['babies', babyId, 'timeline', from, to] as const,

  foodEntries: (babyId: string) => ['babies', babyId, 'food-entries'] as const,
  breastfeeds: (babyId: string) => ['babies', babyId, 'breastfeeds'] as const,
  diaperEvents: (babyId: string) => ['babies', babyId, 'diaper-events'] as const,
  symptoms: (babyId: string) => ['babies', babyId, 'symptoms'] as const,
  episodes: (babyId: string) => ['babies', babyId, 'episodes'] as const,
  medications: (babyId: string) => ['babies', babyId, 'medications'] as const,

  exposures: (babyId: string) => ['babies', babyId, 'exposures'] as const,
  allergenBoard: (babyId: string) => ['babies', babyId, 'allergen-board'] as const,
  journeys: (babyId: string) => ['babies', babyId, 'journeys'] as const,
  activeJourneys: (babyId: string) => ['babies', babyId, 'journeys', 'active'] as const,
  report: (babyId: string, from: string, to: string) =>
    ['babies', babyId, 'report', from, to] as const,
  media: (entityType: string, entityId: string) => ['media', entityType, entityId] as const,

  /** Detalle de un registro concreto y su historial de correcciones. */
  record: (type: string, id: string) => ['records', type, id] as const,
  recordRevisions: (type: string, id: string) => ['records', type, id, 'revisions'] as const,
} as const;
