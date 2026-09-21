import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Text, colors, spacing } from '@/design-system';
import { useT } from '@/lib/i18n';
import type { ReminderCategory } from '@/types/domain';

import { useScheduleReminder } from './useReminders';

/**
 * Pregunta en contexto: "¿quieres que te lo recordemos?".
 *
 * Aparece DESPUÉS de registrar algo, que es cuando la persona sabe si quiere
 * un aviso. Los intervalos son opciones, no una recomendación: AliApp no dice
 * cada cuánto hay que revisar nada.
 */
export function ReminderPrompt({
  category,
  title,
  babyId,
  relatedEntityType,
  relatedEntityId,
  onDismiss,
}: {
  category: ReminderCategory;
  title: string;
  babyId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  onDismiss: () => void;
}) {
  const t = useT();
  const programar = useScheduleReminder();
  const [aviso, setAviso] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);

  if (hecho) {
    return (
      <Card tone="info">
        <Text variant="bodyStrong">{t('reminders.scheduled')}</Text>
        <Button variant="ghost" label={t('common.close')} onPress={onDismiss} />
      </Card>
    );
  }

  return (
    <Card tone="info">
      <Text variant="bodyStrong">{t('reminders.askTitle')}</Text>
      <Text variant="caption" color={colors.textSecondary}>
        {t('reminders.askHint')}
      </Text>

      <View style={styles.opciones}>
        {[30, 60, 120].map((minutos) => (
          <Chip
            key={minutos}
            label={
              minutos < 60
                ? `${minutos} ${t('common.minutesShort')}`
                : `${minutos / 60} ${t('common.hoursShort')}`
            }
            onPress={() => {
              setAviso(null);
              programar.mutate(
                {
                  category,
                  title,
                  minutesFromNow: minutos,
                  babyId,
                  relatedEntityType,
                  relatedEntityId,
                },
                {
                  onSuccess: () => setHecho(true),
                  onError: () => setAviso(t('reminders.permissionNeeded')),
                },
              );
            }}
          />
        ))}
      </View>

      {aviso ? (
        <Text variant="caption" color={colors.error} accessibilityRole="alert">
          {aviso}
        </Text>
      ) : null}

      <Button variant="ghost" label={t('reminders.noThanks')} onPress={onDismiss} />
    </Card>
  );
}

const styles = StyleSheet.create({
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
