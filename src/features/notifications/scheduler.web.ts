import { newId } from '@/lib/ids';
import { nextAllowedTime } from './quiet-hours';
import type { ScheduleInput, ScheduleResult } from './scheduler';

/** Web reminders live in the family dashboard. No background-delivery promise. */
export async function scheduleReminder(input: ScheduleInput): Promise<ScheduleResult> {
  return {
    notificationId: `web:${newId()}`,
    deliverAt: nextAllowedTime(input.when, input.quietHours),
  };
}
export async function ensurePermission(): Promise<boolean> {
  return false;
}
export async function cancelScheduled(_notificationId: string): Promise<void> {
  /* Database state controls in-app reminders. */
}
