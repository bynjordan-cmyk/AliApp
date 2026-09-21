import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type {
  NotificationPreference,
  NotificationSettings,
  Reminder,
  ReminderCategory,
} from '@/types/domain';
import { unwrap, unwrapMaybe } from '@/services/errors';
import { buildSoftDeletePatch } from '@/services/soft-delete';

/**
 * Recordatorios y preferencias de aviso.
 *
 * Todo aquí es personal: las políticas RLS solo dejan ver y escribir lo propio.
 * AliApp no crea recordatorios por su cuenta ni sugiere intervalos.
 */

export type CreateReminderInput = {
  householdId: string;
  babyId?: string;
  category: ReminderCategory;
  title: string;
  notes?: string;
  scheduledFor: string;
  repeatMinutes?: number;
  relatedEntityType?: string;
  relatedEntityId?: string;
  localNotificationId?: string;
};

export async function createReminder(
  input: CreateReminderInput,
  profileId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Reminder> {
  const [row] = unwrap(
    'createReminder',
    await client
      .from('reminders')
      .insert({
        id: newId(),
        household_id: input.householdId,
        baby_id: input.babyId ?? null,
        profile_id: profileId,
        category: input.category,
        title: input.title,
        notes: input.notes ?? null,
        scheduled_for: input.scheduledFor,
        repeat_minutes: input.repeatMinutes ?? null,
        related_entity_type: input.relatedEntityType ?? null,
        related_entity_id: input.relatedEntityId ?? null,
        local_notification_id: input.localNotificationId ?? null,
        created_by: profileId,
      })
      .select('*'),
  );

  if (!row) throw new Error('[AliApp] createReminder: sin fila devuelta');
  return row;
}

export async function listReminders(
  householdId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Reminder[]> {
  return unwrap(
    'listReminders',
    await client
      .from('reminders')
      .select('*')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('scheduled_for', { ascending: true }),
  );
}

export async function cancelReminder(
  reminderId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client
    .from('reminders')
    .update({ status: 'cancelled', ...buildSoftDeletePatch() })
    .eq('id', reminderId);

  if (error) throw new Error(`[AliApp] cancelReminder: ${error.message}`);
}

export async function snoozeReminder(
  reminderId: string,
  nextTime: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client
    .from('reminders')
    .update({ status: 'snoozed', scheduled_for: nextTime })
    .eq('id', reminderId);

  if (error) throw new Error(`[AliApp] snoozeReminder: ${error.message}`);
}

// --- Preferencias -----------------------------------------------------------

export async function listPreferences(
  householdId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<NotificationPreference[]> {
  return unwrap(
    'listPreferences',
    await client.from('notification_preferences').select('*').eq('household_id', householdId),
  );
}

export async function setPreference(
  householdId: string,
  profileId: string,
  category: ReminderCategory,
  enabled: boolean,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('notification_preferences').upsert(
    { household_id: householdId, profile_id: profileId, category, enabled },
    { onConflict: 'profile_id,household_id,category' },
  );

  if (error) throw new Error(`[AliApp] setPreference: ${error.message}`);
}

export async function getSettings(
  householdId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<NotificationSettings | null> {
  return unwrapMaybe(
    'getSettings',
    await client
      .from('notification_settings')
      .select('*')
      .eq('household_id', householdId)
      .maybeSingle(),
  );
}

export async function saveSettings(
  householdId: string,
  profileId: string,
  patch: {
    pushEnabled?: boolean;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    pushToken?: string | null;
    deviceTimezone?: string | null;
  },
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('notification_settings').upsert(
    {
      household_id: householdId,
      profile_id: profileId,
      ...(patch.pushEnabled === undefined ? {} : { push_enabled: patch.pushEnabled }),
      ...(patch.quietHoursStart === undefined ? {} : { quiet_hours_start: patch.quietHoursStart }),
      ...(patch.quietHoursEnd === undefined ? {} : { quiet_hours_end: patch.quietHoursEnd }),
      ...(patch.pushToken === undefined ? {} : { push_token: patch.pushToken }),
      ...(patch.deviceTimezone === undefined ? {} : { device_timezone: patch.deviceTimezone }),
    },
    { onConflict: 'profile_id,household_id' },
  );

  if (error) throw new Error(`[AliApp] saveSettings: ${error.message}`);
}
