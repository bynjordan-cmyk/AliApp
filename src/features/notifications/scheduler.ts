import * as Notifications from 'expo-notifications';

import type { ReminderCategory } from '@/types/domain';

import { nextAllowedTime, type QuietHours } from './quiet-hours';

/**
 * Programación de avisos locales.
 *
 * Reglas del encargo (§6):
 *   - el permiso se pide CUANDO la persona activa un recordatorio, nunca al
 *     abrir la aplicación,
 *   - AliApp no propone horarios ni intervalos: recibe los que le dan,
 *   - un aviso que cae en horas de silencio se retrasa, no se pierde.
 *
 * Los recordatorios locales funcionan sin servidor y sin token push, que es lo
 * que hace falta para la V1.
 */

export class NotificationPermissionDenied extends Error {
  constructor() {
    super('[AliApp] permiso de notificaciones denegado');
    this.name = 'NotificationPermissionDenied';
  }
}

/** Pide el permiso en contexto. Devuelve false si la persona lo rechaza. */
export async function ensurePermission(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;

  // `canAskAgain` en false significa que hay que ir a los ajustes del sistema.
  if (!actual.canAskAgain) return false;

  const solicitado = await Notifications.requestPermissionsAsync();
  return solicitado.granted;
}

export type ScheduleInput = {
  category: ReminderCategory;
  title: string;
  body?: string;
  when: Date;
  quietHours: QuietHours;
  /** Repetición elegida por la persona, en minutos. */
  repeatMinutes?: number;
};

export type ScheduleResult = {
  notificationId: string;
  /** Momento real de entrega, ya desplazado si caía en horas de silencio. */
  deliverAt: Date;
};

export async function scheduleReminder(input: ScheduleInput): Promise<ScheduleResult> {
  if (!(await ensurePermission())) {
    throw new NotificationPermissionDenied();
  }

  const deliverAt = nextAllowedTime(input.when, input.quietHours);
  const seconds = Math.max(1, Math.round((deliverAt.getTime() - Date.now()) / 1000));

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: { category: input.category },
    },
    trigger: input.repeatMinutes
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(60, input.repeatMinutes * 60),
          repeats: true,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
  });

  return { notificationId, deliverAt };
}

export async function cancelScheduled(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
