import type { Enums, Tables, Views } from '@/lib/supabase/database.types';

/**
 * Tipos de dominio de AliApp, derivados de los tipos generados de la base.
 *
 * Todo lo que el producto llama por su nombre vive aquí, de modo que las
 * pantallas y los servicios no dependan directamente del generador.
 */

// --- Identidad y hogar -----------------------------------------------------
export type Household = Tables<'households'>;
export type Profile = Tables<'profiles'>;
export type HouseholdMember = Tables<'household_members'>;
export type MemberRole = Enums<'member_role'>;
export type MemberStatus = Enums<'member_status'>;

export const MEMBER_ROLES: readonly MemberRole[] = [
  'owner',
  'parent',
  'caregiver',
  'professional_viewer',
] as const;

/** Roles que pueden crear eventos de rutina. Refleja la política RLS. */
export const LOGGING_ROLES: readonly MemberRole[] = ['owner', 'parent', 'caregiver'] as const;

/** Roles que gestionan el hogar, los planes y los estados de alimento. */
export const MANAGER_ROLES: readonly MemberRole[] = ['owner', 'parent'] as const;

// --- Bebé ------------------------------------------------------------------
export type Baby = Tables<'babies'>;

/**
 * Etapa alimentaria. La elige la familia; la edad solo puede sugerirla.
 * AliApp no decide cuándo un bebé empieza con sólidos.
 */
export type FeedingStage = Enums<'feeding_stage'>;

// --- Catálogo de alimentos -------------------------------------------------
export type Food = Tables<'foods'>;
export type FoodTranslation = Tables<'food_translations'>;

export type LocalizedFood = Food & {
  /** Nombre ya resuelto para el idioma activo. */
  displayName: string;
};

// --- Eventos ---------------------------------------------------------------
export type FoodEntry = Tables<'food_entries'>;
export type FoodEntryItem = Tables<'food_entry_items'>;
export type Breastfeed = Tables<'breastfeeds'>;
export type DiaperEvent = Tables<'diaper_events'>;
export type Symptom = Tables<'symptoms'>;
export type ReactionEpisode = Tables<'reaction_episodes'>;
export type MedicationEvent = Tables<'medication_events'>;

export type FoodSubjectType = Enums<'food_subject_type'>;
export type MealType = Enums<'meal_type'>;
export type DiaperType = Enums<'diaper_type'>;
export type BreastSide = Enums<'breast_side'>;
/** Vía de la toma de leche: pecho, fórmula o leche extraída. */
export type FeedKind = Enums<'feed_kind'>;
export type EpisodeStatus = Enums<'episode_status'>;

/** Intensidad observada por la familia (1..3). No es una escala clínica. */
export type SymptomSeverity = 1 | 2 | 3;

// --- Grafo de exposiciones -------------------------------------------------
export type Exposure = Tables<'exposures'>;
export type EpisodeExposure = Tables<'episode_exposures'>;
export type ExposureSourceType = Enums<'exposure_source_type'>;
export type EpisodeExposureRelation = Enums<'episode_exposure_relation'>;
/** Etiqueta descriptiva de consistencia temporal. Nunca un juicio médico. */
export type ExposureConfidenceLabel = Enums<'exposure_confidence_label'>;

// --- Procesos --------------------------------------------------------------
export type Journey = Tables<'journeys'>;
export type JourneyTarget = Tables<'journey_targets'>;
export type JourneyType = Enums<'journey_type'>;
export type JourneyStatus = Enums<'journey_status'>;
export type JourneyIndicatedBy = Enums<'journey_indicated_by'>;
export type JourneyTargetSubject = Enums<'journey_target_subject'>;
export type JourneyTargetAction = Enums<'journey_target_action'>;

// --- Estado de alimentos ---------------------------------------------------
export type BabyFoodStatusRow = Tables<'baby_food_status'>;
export type FoodStatus = Enums<'food_status'>;
export type FoodStatusSource = Enums<'food_status_source'>;

export const FOOD_STATUSES: readonly FoodStatus[] = [
  'unknown',
  'introducing',
  'observing',
  'tolerated',
  'avoid',
  'professional_supervision',
] as const;

/**
 * Estados que solo puede fijar una persona. El sistema mantiene contadores y
 * fechas, nunca declara una restricción por su cuenta (§5, §10).
 */
export const HUMAN_ONLY_FOOD_STATUSES: readonly FoodStatus[] = [
  'avoid',
  'professional_supervision',
] as const;

// --- Adjuntos --------------------------------------------------------------
export type MediaAsset = Tables<'media_assets'>;
export type MediaEntityType = Enums<'media_entity_type'>;
export type MediaType = Enums<'media_type'>;
export type MediaCategory = Enums<'media_category'>;

// --- Vistas ----------------------------------------------------------------
export type TimelineEventRow = Views<'timeline_events'>;
export type AllergenBoardRow = Views<'allergen_board'>;

// --- Avisos y recordatorios -------------------------------------------------
export type Reminder = Tables<'reminders'>;
export type NotificationPreference = Tables<'notification_preferences'>;
export type NotificationSettings = Tables<'notification_settings'>;
export type ReminderCategory = Enums<'reminder_category'>;
export type ReminderStatus = Enums<'reminder_status'>;

/**
 * Categorías de aviso que ofrece la interfaz.
 *
 * AliApp no crea ninguna por su cuenta ni propone horarios: cada recordatorio
 * lo configura una persona.
 */
export const REMINDER_CATEGORIES: readonly ReminderCategory[] = [
  'feeding',
  'breastfeeding',
  'symptom_followup',
  'open_episode',
  'medication',
  'journey_review',
  'reintroduction',
  'daily_summary',
  'household_updates',
] as const;

// --- Detalle de deposición --------------------------------------------------
export type StoolAmount = Enums<'stool_amount'>;

// --- Historial de correcciones ----------------------------------------------
/**
 * Una corrección registrada por la base. La escribe un trigger, no el cliente:
 * el historial no depende de que la app se acuerde de anotarlo.
 */
export type EventRevision = Tables<'event_revisions'>;
