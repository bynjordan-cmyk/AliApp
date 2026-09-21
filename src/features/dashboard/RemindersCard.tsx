import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, Text, colors, radius, spacing, surfaces } from '@/design-system';
import { useCancelReminder, useSnoozeReminder, useCompleteReminder } from '@/features/notifications/useReminders';
import { formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { Reminder } from '@/types/domain';

/**
 * Próximos recordatorios en el dashboard.
 *
 * Cada uno se puede marcar como hecho, posponer o desactivar. Los intervalos
 * de posposición son opciones, no una recomendación: AliApp no dice cada
 * cuánto hay que revisar nada.
 */
/**
 * `generatedAt` llega desde el resumen del día: el componente no lee el reloj
 * mientras pinta, así que todos los recordatorios se miden contra el mismo
 * instante y el render es reproducible.
 */
export function RemindersCard({
  reminders,
  generatedAt,
}: {
  reminders: Reminder[];
  generatedAt: string;
}) {
  const { t, locale } = useI18n();
  const ahora = new Date(generatedAt).getTime();
  const completar = useCompleteReminder();
  const posponer = useSnoozeReminder();
  const desactivar = useCancelReminder();

  if (reminders.length === 0) {
    return (
      <Card>
        <Text variant="bodyStrong">{t('home.reminders')}</Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('reminders.emptyHint')}
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="bodyStrong">{t('home.reminders')}</Text>

      {reminders.slice(0, 4).map((reminder) => {
        const minutos = Math.round(
          (new Date(reminder.scheduled_for).getTime() - ahora) / 60000,
        );
        const cuando =
          minutos < 60
            ? t('reminders.inMinutes', { minutes: Math.max(0, minutos) })
            : t('reminders.inHours', { hours: Math.round(minutos / 60) });

        return (
          <View key={reminder.id} style={styles.fila}>
            <View style={[styles.icono, { backgroundColor: surfaces.neutral.background }]}>
              <Ionicons name="alarm-outline" size={16} color={colors.brand} accessible={false} />
            </View>

            <View style={styles.texto}>
              <Text variant="caption">{reminder.title}</Text>
              <Text variant="overline" color={colors.textSecondary}>
                {formatTime(reminder.scheduled_for, locale)} · {cuando}
              </Text>
            </View>

            <View style={styles.acciones}>
              <Chip
                label={t('reminders.complete')}
                onPress={() => completar.mutate(reminder.id)}
              />
              <Chip
                label={t('reminders.snooze')}
                onPress={() => posponer.mutate({ reminderId: reminder.id, minutes: 30 })}
              />
              <Chip
                label={t('reminders.disable')}
                onPress={() => desactivar.mutate(reminder.id)}
              />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  fila: { gap: spacing.xs, paddingVertical: spacing.sm },
  icono: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { gap: spacing.xxs },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
