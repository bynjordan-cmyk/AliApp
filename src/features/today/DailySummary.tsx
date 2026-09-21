import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card, Text, colors, eventPresentation, radius, spacing } from '@/design-system';
import { useT } from '@/lib/i18n';
import type { TimelineItem } from '@/types/timeline';

/**
 * Resumen del día: recuento factual de lo registrado.
 *
 * Solo cuenta. No interpreta, no compara con "lo normal" y no sugiere nada.
 */
export function DailySummary({ items }: { items: TimelineItem[] }) {
  const t = useT();

  const counts = items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.type] = (accumulator[item.type] ?? 0) + 1;
    return accumulator;
  }, {});

  const entries = [
    {
      label: t('timeline.breastfeed'),
      value: counts.breastfeed ?? 0,
      ...eventPresentation.breastfeed,
    },
    { label: t('timeline.foodEntry'), value: counts.food_entry ?? 0, ...eventPresentation.food },
    { label: t('timeline.diaper'), value: counts.diaper_event ?? 0, ...eventPresentation.diaper },
    { label: t('timeline.symptom'), value: counts.symptom ?? 0, ...eventPresentation.symptom },
  ];

  return (
    <Card>
      <Text variant="subtitle">{t('today.summary')}</Text>
      <View style={styles.row}>
        {entries.map((entry) => (
          <View key={entry.label} style={[styles.cell, { backgroundColor: entry.background }]}>
            <Ionicons name={entry.icon} size={22} color={colors.brand} accessible={false} />
            <Text variant="title">{entry.value}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {entry.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  cell: {
    flexBasis: '45%',
    flexGrow: 1,
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
});
