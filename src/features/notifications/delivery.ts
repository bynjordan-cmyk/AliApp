import type { ReminderCategory } from '@/types/domain';

import { isWithinQuietHours, type QuietHours } from './quiet-hours';

/**
 * Decisión de entrega de un aviso.
 *
 * Tres interruptores y en este orden: el general de la persona, el de la
 * categoría y las horas de silencio. Si el primero está apagado, no se mira
 * nada más: nadie debería recibir un aviso que ha desactivado.
 */

export type DeliverySettings = {
  pushEnabled: boolean;
  quietHours: QuietHours;
  /** Categorías explícitamente apagadas por esta persona. */
  disabledCategories: ReminderCategory[];
};

export type DeliveryDecision =
  | { deliver: true }
  | { deliver: false; reason: 'push_disabled' | 'category_disabled' | 'quiet_hours' };

export function decideDelivery(
  category: ReminderCategory,
  when: Date,
  settings: DeliverySettings,
): DeliveryDecision {
  if (!settings.pushEnabled) {
    return { deliver: false, reason: 'push_disabled' };
  }

  if (settings.disabledCategories.includes(category)) {
    return { deliver: false, reason: 'category_disabled' };
  }

  if (isWithinQuietHours(when, settings.quietHours)) {
    return { deliver: false, reason: 'quiet_hours' };
  }

  return { deliver: true };
}
