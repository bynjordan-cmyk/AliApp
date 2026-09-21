import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ListItem, SectionHeader, Text, colors, spacing } from '@/design-system';
import { formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import type { TimelineItemType } from '@/types/timeline';

import type { CompletionField, PendingRecord } from './completeness';

/**
 * "Pendientes de completar".
 *
 * Una invitación, nunca un reproche. Quien guardó un pañal a las cuatro de la
 * mañana con dos toques hizo lo correcto; esto solo dice que, si le apetece,
 * puede añadir el color ahora que hay luz.
 *
 * De ahí tres decisiones:
 *   · el título no dice "incompleto" ni "te falta",
 *   · se puede ocultar y no vuelve a insistir en esta sesión,
 *   · no hay contador rojo, ni insignia, ni nada que parezca una tarea.
 */

const TITULO_POR_TIPO: Record<TimelineItemType, TranslationKey> = {
  food_entry: 'timeline.foodEntry',
  breastfeed: 'timeline.breastfeed',
  diaper_event: 'timeline.diaper',
  symptom: 'timeline.symptom',
  reaction_episode: 'timeline.episode',
  medication_event: 'timeline.medication',
};

const CAMPO: Record<CompletionField, TranslationKey> = {
  endedAt: 'pending.field.endedAt',
  side: 'pending.field.side',
  amountMl: 'pending.field.amountMl',
  brand: 'pending.field.brand',
  mealType: 'pending.field.mealType',
  amountText: 'pending.field.amountText',
  stoolConsistency: 'pending.field.stoolConsistency',
  stoolColor: 'pending.field.stoolColor',
  stoolAmount: 'pending.field.stoolAmount',
  severity: 'pending.field.severity',
  doseText: 'pending.field.doseText',
};

export function PendingRecordsCard({ records }: { records: PendingRecord[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [oculto, setOculto] = useState(false);

  if (oculto || records.length === 0) return null;

  return (
    <Card tone="calm">
      <SectionHeader
        title={t('pending.title')}
        subtitle={
          records.length === 1
            ? t('pending.countOne')
            : t('pending.count', { count: records.length })
        }
      />

      <Text variant="caption" color={colors.textSecondary}>
        {t('pending.hint')}
      </Text>

      <View style={styles.lista}>
        {records.map((record) => (
          <ListItem
            key={`${record.type}-${record.id}`}
            title={t(TITULO_POR_TIPO[record.type])}
            subtitle={t('pending.canAdd', {
              fields: record.missing.map((campo) => t(CAMPO[campo])).join(', '),
            })}
            meta={formatTime(record.occurredAt, locale)}
            onPress={() => router.push(`/record/${record.type}/${record.id}`)}
          />
        ))}
      </View>

      <Button variant="ghost" label={t('pending.dismiss')} onPress={() => setOculto(true)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.sm },
});
