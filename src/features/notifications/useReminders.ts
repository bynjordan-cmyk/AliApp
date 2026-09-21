import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import type { ReminderCategory } from '@/types/domain';

import {
  createReminder,
  getSettings,
  listPreferences,
  listReminders,
  setPreference,
  saveSettings,
  cancelReminder,
  completeReminder,
  snoozeReminder,
} from './reminder.service';
import { snoozeTo } from './quiet-hours';
import { scheduleReminder } from './scheduler';

const CLAVE = 'reminders';

export function useReminders() {
  const { household } = useActiveBaby();

  return useQuery({
    queryKey: [CLAVE, household?.id ?? 'none'],
    queryFn: () => listReminders(household?.id as string),
    enabled: Boolean(household?.id),
  });
}

export function useNotificationSettings() {
  const { household } = useActiveBaby();

  const settings = useQuery({
    queryKey: [CLAVE, 'settings', household?.id ?? 'none'],
    queryFn: () => getSettings(household?.id as string),
    enabled: Boolean(household?.id),
  });

  const preferences = useQuery({
    queryKey: [CLAVE, 'preferences', household?.id ?? 'none'],
    queryFn: () => listPreferences(household?.id as string),
    enabled: Boolean(household?.id),
  });

  return { settings, preferences };
}

export function useSavePreference() {
  const queryClient = useQueryClient();
  const { household } = useActiveBaby();
  const { profile } = useSession();

  return useMutation({
    mutationFn: ({ category, enabled }: { category: ReminderCategory; enabled: boolean }) =>
      setPreference(household?.id as string, profile?.id as string, category, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CLAVE, 'preferences', household?.id] });
    },
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  const { household } = useActiveBaby();
  const { profile } = useSession();

  return useMutation({
    mutationFn: (patch: Parameters<typeof saveSettings>[2]) =>
      saveSettings(household?.id as string, profile?.id as string, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CLAVE, 'settings', household?.id] });
    },
  });
}

export type ScheduleReminderInput = {
  category: ReminderCategory;
  title: string;
  minutesFromNow: number;
  babyId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

/**
 * Programa un recordatorio: pide permiso, lo agenda en el dispositivo y lo
 * guarda. Si la persona rechaza el permiso, no se guarda nada y el error se
 * propaga para que la interfaz lo explique con calma.
 */
export function useScheduleReminder() {
  const queryClient = useQueryClient();
  const { household } = useActiveBaby();
  const { profile } = useSession();
  const { settings } = useNotificationSettings();

  return useMutation({
    mutationFn: async (input: ScheduleReminderInput) => {
      const cuando = new Date(Date.now() + input.minutesFromNow * 60000);
      const quietHours = {
        start: settings.data?.quiet_hours_start ?? null,
        end: settings.data?.quiet_hours_end ?? null,
      };

      const programado = await scheduleReminder({
        category: input.category,
        title: input.title,
        when: cuando,
        quietHours,
      });

      return createReminder(
        {
          householdId: household?.id as string,
          babyId: input.babyId,
          category: input.category,
          title: input.title,
          scheduledFor: programado.deliverAt.toISOString(),
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          localNotificationId: programado.notificationId,
        },
        profile?.id as string,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CLAVE, household?.id] });
    },
  });
}

export function useCancelReminder() {
  const queryClient = useQueryClient();
  const { household } = useActiveBaby();

  return useMutation({
    mutationFn: (reminderId: string) => cancelReminder(reminderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CLAVE, household?.id] });
    },
  });
}

/** Marca un recordatorio como hecho. No lo borra: queda su rastro. */
export function useCompleteReminder() {
  const queryClient = useQueryClient();
  const { household } = useActiveBaby();

  return useMutation({
    mutationFn: (reminderId: string) => completeReminder(reminderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CLAVE, household?.id] });
    },
  });
}

/**
 * Pospone un recordatorio. Si la nueva hora cae en horas de silencio, se
 * desplaza hasta que terminan: un aviso pospuesto no debería sonar de noche.
 */
export function useSnoozeReminder() {
  const queryClient = useQueryClient();
  const { household } = useActiveBaby();
  const { settings } = useNotificationSettings();

  return useMutation({
    mutationFn: ({ reminderId, minutes }: { reminderId: string; minutes: number }) => {
      const siguiente = snoozeTo(new Date(), minutes, {
        start: settings.data?.quiet_hours_start ?? null,
        end: settings.data?.quiet_hours_end ?? null,
      });
      return snoozeReminder(reminderId, siguiente.toISOString());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CLAVE, household?.id] });
    },
  });
}
