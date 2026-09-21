/**
 * FICHERO GENERADO. No editar a mano.
 *
 * Se regenera con `npm run db:types` a partir del esquema real de Postgres,
 * después de aplicar las migraciones de `supabase/migrations`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      babies: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          birth_date: string | null;
          feeding_mode: string[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          birth_date?: string | null;
          feeding_mode?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          birth_date?: string | null;
          feeding_mode?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      baby_food_status: {
        Row: {
          baby_id: string;
          food_id: string;
          status: Database['public']['Enums']['food_status'];
          first_exposure_at: string | null;
          last_exposure_at: string | null;
          exposure_count: number;
          status_updated_at: string;
          status_updated_by: string | null;
          status_source: Database['public']['Enums']['food_status_source'];
          created_at: string;
        };
        Insert: {
          baby_id: string;
          food_id: string;
          status?: Database['public']['Enums']['food_status'];
          first_exposure_at?: string | null;
          last_exposure_at?: string | null;
          exposure_count?: number;
          status_updated_at?: string;
          status_updated_by?: string | null;
          status_source?: Database['public']['Enums']['food_status_source'];
          created_at?: string;
        };
        Update: {
          baby_id?: string;
          food_id?: string;
          status?: Database['public']['Enums']['food_status'];
          first_exposure_at?: string | null;
          last_exposure_at?: string | null;
          exposure_count?: number;
          status_updated_at?: string;
          status_updated_by?: string | null;
          status_source?: Database['public']['Enums']['food_status_source'];
          created_at?: string;
        };
        Relationships: [];
      };
      breastfeeds: {
        Row: {
          id: string;
          household_id: string;
          baby_id: string;
          feeding_parent_profile_id: string | null;
          started_at: string;
          ended_at: string | null;
          side: Database['public']['Enums']['breast_side'] | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          baby_id: string;
          feeding_parent_profile_id?: string | null;
          started_at: string;
          ended_at?: string | null;
          side?: Database['public']['Enums']['breast_side'] | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          baby_id?: string;
          feeding_parent_profile_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          side?: Database['public']['Enums']['breast_side'] | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      diaper_events: {
        Row: {
          id: string;
          household_id: string;
          baby_id: string;
          occurred_at: string;
          diaper_type: Database['public']['Enums']['diaper_type'];
          stool_consistency: string | null;
          stool_color: string | null;
          mucus: boolean | null;
          blood_observed: boolean | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          stool_amount: Database['public']['Enums']['stool_amount'] | null;
          visible_food_residue: boolean | null;
          straining: boolean | null;
          unusual_odor: boolean | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          baby_id: string;
          occurred_at: string;
          diaper_type: Database['public']['Enums']['diaper_type'];
          stool_consistency?: string | null;
          stool_color?: string | null;
          mucus?: boolean | null;
          blood_observed?: boolean | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          stool_amount?: Database['public']['Enums']['stool_amount'] | null;
          visible_food_residue?: boolean | null;
          straining?: boolean | null;
          unusual_odor?: boolean | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          baby_id?: string;
          occurred_at?: string;
          diaper_type?: Database['public']['Enums']['diaper_type'];
          stool_consistency?: string | null;
          stool_color?: string | null;
          mucus?: boolean | null;
          blood_observed?: boolean | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          stool_amount?: Database['public']['Enums']['stool_amount'] | null;
          visible_food_residue?: boolean | null;
          straining?: boolean | null;
          unusual_odor?: boolean | null;
        };
        Relationships: [];
      };
      episode_exposures: {
        Row: {
          episode_id: string;
          exposure_id: string;
          relation_type: Database['public']['Enums']['episode_exposure_relation'];
          confidence_label: Database['public']['Enums']['exposure_confidence_label'] | null;
          created_at: string;
        };
        Insert: {
          episode_id: string;
          exposure_id: string;
          relation_type?: Database['public']['Enums']['episode_exposure_relation'];
          confidence_label?: Database['public']['Enums']['exposure_confidence_label'] | null;
          created_at?: string;
        };
        Update: {
          episode_id?: string;
          exposure_id?: string;
          relation_type?: Database['public']['Enums']['episode_exposure_relation'];
          confidence_label?: Database['public']['Enums']['exposure_confidence_label'] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      episode_symptoms: {
        Row: {
          episode_id: string;
          symptom_id: string;
          created_at: string;
        };
        Insert: {
          episode_id: string;
          symptom_id: string;
          created_at?: string;
        };
        Update: {
          episode_id?: string;
          symptom_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      exposures: {
        Row: {
          id: string;
          household_id: string;
          baby_id: string;
          source_type: Database['public']['Enums']['exposure_source_type'];
          source_id: string | null;
          food_id: string | null;
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          baby_id: string;
          source_type: Database['public']['Enums']['exposure_source_type'];
          source_id?: string | null;
          food_id?: string | null;
          occurred_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          baby_id?: string;
          source_type?: Database['public']['Enums']['exposure_source_type'];
          source_id?: string | null;
          food_id?: string | null;
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      food_entries: {
        Row: {
          id: string;
          household_id: string;
          subject_type: Database['public']['Enums']['food_subject_type'];
          baby_id: string | null;
          caregiver_profile_id: string | null;
          occurred_at: string;
          meal_type: Database['public']['Enums']['meal_type'] | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          subject_type: Database['public']['Enums']['food_subject_type'];
          baby_id?: string | null;
          caregiver_profile_id?: string | null;
          occurred_at: string;
          meal_type?: Database['public']['Enums']['meal_type'] | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          subject_type?: Database['public']['Enums']['food_subject_type'];
          baby_id?: string | null;
          caregiver_profile_id?: string | null;
          occurred_at?: string;
          meal_type?: Database['public']['Enums']['meal_type'] | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      food_entry_items: {
        Row: {
          id: string;
          food_entry_id: string;
          food_id: string;
          amount_text: string | null;
          is_first_exposure: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          food_entry_id: string;
          food_id: string;
          amount_text?: string | null;
          is_first_exposure?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          food_entry_id?: string;
          food_id?: string;
          amount_text?: string | null;
          is_first_exposure?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      food_translations: {
        Row: {
          food_id: string;
          locale: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          food_id: string;
          locale: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          food_id?: string;
          locale?: string;
          display_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      foods: {
        Row: {
          id: string;
          canonical_key: string;
          canonical_name: string;
          category: string | null;
          is_major_allergen: boolean;
          allergen_code: string | null;
          aliases: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          canonical_key: string;
          canonical_name: string;
          category?: string | null;
          is_major_allergen?: boolean;
          allergen_code?: string | null;
          aliases?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          canonical_key?: string;
          canonical_name?: string;
          category?: string | null;
          is_major_allergen?: boolean;
          allergen_code?: string | null;
          aliases?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          household_id: string;
          profile_id: string;
          role: Database['public']['Enums']['member_role'];
          status: Database['public']['Enums']['member_status'];
          permissions: Json;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          household_id: string;
          profile_id: string;
          role?: Database['public']['Enums']['member_role'];
          status?: Database['public']['Enums']['member_status'];
          permissions?: Json;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          household_id?: string;
          profile_id?: string;
          role?: Database['public']['Enums']['member_role'];
          status?: Database['public']['Enums']['member_status'];
          permissions?: Json;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          id: string;
          name: string;
          locale: string;
          country_code: string | null;
          plan: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          locale?: string;
          country_code?: string | null;
          plan?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          locale?: string;
          country_code?: string | null;
          plan?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      journey_targets: {
        Row: {
          id: string;
          journey_id: string;
          food_id: string;
          target_subject: Database['public']['Enums']['journey_target_subject'];
          action: Database['public']['Enums']['journey_target_action'];
          created_at: string;
        };
        Insert: {
          id?: string;
          journey_id: string;
          food_id: string;
          target_subject: Database['public']['Enums']['journey_target_subject'];
          action: Database['public']['Enums']['journey_target_action'];
          created_at?: string;
        };
        Update: {
          id?: string;
          journey_id?: string;
          food_id?: string;
          target_subject?: Database['public']['Enums']['journey_target_subject'];
          action?: Database['public']['Enums']['journey_target_action'];
          created_at?: string;
        };
        Relationships: [];
      };
      journeys: {
        Row: {
          id: string;
          household_id: string;
          baby_id: string;
          journey_type: Database['public']['Enums']['journey_type'];
          status: Database['public']['Enums']['journey_status'];
          started_on: string;
          review_on: string | null;
          completed_on: string | null;
          indicated_by: Database['public']['Enums']['journey_indicated_by'];
          professional_name: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          baby_id: string;
          journey_type: Database['public']['Enums']['journey_type'];
          status?: Database['public']['Enums']['journey_status'];
          started_on?: string;
          review_on?: string | null;
          completed_on?: string | null;
          indicated_by?: Database['public']['Enums']['journey_indicated_by'];
          professional_name?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          baby_id?: string;
          journey_type?: Database['public']['Enums']['journey_type'];
          status?: Database['public']['Enums']['journey_status'];
          started_on?: string;
          review_on?: string | null;
          completed_on?: string | null;
          indicated_by?: Database['public']['Enums']['journey_indicated_by'];
          professional_name?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_assets: {
        Row: {
          id: string;
          household_id: string;
          entity_type: Database['public']['Enums']['media_entity_type'];
          entity_id: string;
          storage_path: string;
          media_type: Database['public']['Enums']['media_type'];
          category: Database['public']['Enums']['media_category'] | null;
          captured_at: string | null;
          created_by: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          entity_type: Database['public']['Enums']['media_entity_type'];
          entity_id: string;
          storage_path: string;
          media_type?: Database['public']['Enums']['media_type'];
          category?: Database['public']['Enums']['media_category'] | null;
          captured_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          entity_type?: Database['public']['Enums']['media_entity_type'];
          entity_id?: string;
          storage_path?: string;
          media_type?: Database['public']['Enums']['media_type'];
          category?: Database['public']['Enums']['media_category'] | null;
          captured_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      medication_events: {
        Row: {
          id: string;
          household_id: string;
          baby_id: string;
          name: string;
          dose_text: string | null;
          occurred_at: string;
          reason_text: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          baby_id: string;
          name: string;
          dose_text?: string | null;
          occurred_at: string;
          reason_text?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          baby_id?: string;
          name?: string;
          dose_text?: string | null;
          occurred_at?: string;
          reason_text?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          profile_id: string;
          household_id: string;
          category: Database['public']['Enums']['reminder_category'];
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          household_id: string;
          category: Database['public']['Enums']['reminder_category'];
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          household_id?: string;
          category?: Database['public']['Enums']['reminder_category'];
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_settings: {
        Row: {
          profile_id: string;
          household_id: string;
          push_enabled: boolean;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          device_timezone: string | null;
          push_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          household_id: string;
          push_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          device_timezone?: string | null;
          push_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          household_id?: string;
          push_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          device_timezone?: string | null;
          push_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          display_name: string;
          avatar_path: string | null;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          display_name?: string;
          avatar_path?: string | null;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          display_name?: string;
          avatar_path?: string | null;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reaction_episodes: {
        Row: {
          id: string;
          household_id: string;
          baby_id: string;
          started_at: string;
          ended_at: string | null;
          status: Database['public']['Enums']['episode_status'];
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          baby_id: string;
          started_at: string;
          ended_at?: string | null;
          status?: Database['public']['Enums']['episode_status'];
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          baby_id?: string;
          started_at?: string;
          ended_at?: string | null;
          status?: Database['public']['Enums']['episode_status'];
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          household_id: string;
          baby_id: string | null;
          profile_id: string;
          category: Database['public']['Enums']['reminder_category'];
          title: string;
          notes: string | null;
          scheduled_for: string;
          repeat_minutes: number | null;
          status: Database['public']['Enums']['reminder_status'];
          related_entity_type: string | null;
          related_entity_id: string | null;
          local_notification_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          baby_id?: string | null;
          profile_id: string;
          category: Database['public']['Enums']['reminder_category'];
          title: string;
          notes?: string | null;
          scheduled_for: string;
          repeat_minutes?: number | null;
          status?: Database['public']['Enums']['reminder_status'];
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          local_notification_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          baby_id?: string | null;
          profile_id?: string;
          category?: Database['public']['Enums']['reminder_category'];
          title?: string;
          notes?: string | null;
          scheduled_for?: string;
          repeat_minutes?: number | null;
          status?: Database['public']['Enums']['reminder_status'];
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          local_notification_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      symptoms: {
        Row: {
          id: string;
          household_id: string;
          baby_id: string;
          symptom_type: string;
          started_at: string;
          ended_at: string | null;
          severity: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          household_id: string;
          baby_id: string;
          symptom_type: string;
          started_at: string;
          ended_at?: string | null;
          severity?: number | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          baby_id?: string;
          symptom_type?: string;
          started_at?: string;
          ended_at?: string | null;
          severity?: number | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      allergen_board: {
        Row: {
          baby_id: string | null;
          household_id: string | null;
          food_id: string | null;
          canonical_key: string | null;
          canonical_name: string | null;
          category: string | null;
          is_major_allergen: boolean | null;
          allergen_code: string | null;
          status: Database['public']['Enums']['food_status'] | null;
          exposure_count: number | null;
          first_exposure_at: string | null;
          last_exposure_at: string | null;
          status_updated_at: string | null;
          status_updated_by: string | null;
          status_source: Database['public']['Enums']['food_status_source'] | null;
        };
        Relationships: [];
      };
      timeline_events: {
        Row: {
          id: string | null;
          type: string | null;
          household_id: string | null;
          baby_id: string | null;
          occurred_at: string | null;
          title_key: string | null;
          actor_profile_id: string | null;
          source_table: string | null;
          metadata: Json | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      build_report: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
      create_household: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      breast_side: 'left' | 'right' | 'both';
      diaper_type: 'urine' | 'stool' | 'both';
      episode_exposure_relation: 'manual' | 'temporal_candidate';
      episode_status: 'open' | 'resolved';
      exposure_confidence_label: 'insufficient_data' | 'under_observation' | 'temporally_consistent' | 'inconsistent';
      exposure_source_type: 'baby_food' | 'maternal_food' | 'breastfeed' | 'pumped_milk' | 'unknown';
      food_status: 'unknown' | 'introducing' | 'observing' | 'tolerated' | 'avoid' | 'professional_supervision';
      food_status_source: 'family' | 'professional_plan' | 'system_summary';
      food_subject_type: 'baby' | 'caregiver';
      journey_indicated_by: 'family' | 'pediatrician' | 'allergist' | 'dietitian' | 'other';
      journey_status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
      journey_target_action: 'avoid' | 'introduce' | 'maintain' | 'observe';
      journey_target_subject: 'baby' | 'caregiver';
      journey_type: 'tracking' | 'introduction' | 'observation' | 'exclusion' | 'reintroduction' | 'known_allergy';
      meal_type: 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'other';
      media_category: 'skin' | 'diaper' | 'food' | 'plan' | 'other';
      media_entity_type: 'symptom' | 'reaction_episode' | 'diaper_event' | 'food_entry' | 'journey' | 'baby';
      media_type: 'photo' | 'document';
      member_role: 'owner' | 'parent' | 'caregiver' | 'professional_viewer';
      member_status: 'invited' | 'active' | 'revoked';
      reminder_category: 'feeding' | 'breastfeeding' | 'symptom_followup' | 'open_episode' | 'medication' | 'journey_review' | 'reintroduction' | 'daily_summary' | 'household_updates';
      reminder_status: 'scheduled' | 'done' | 'snoozed' | 'cancelled';
      stool_amount: 'scant' | 'moderate' | 'large';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
