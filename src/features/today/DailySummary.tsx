import { StyleSheet, View } from 'react-native';

import { Card, StatTile, Text, spacing } from '@/design-system';
import { useT } from '@/lib/i18n';
import type { TimelineItem } from '@/types/timeline';

/**
 * Resumen del día: recuento factual de lo registrado.
 *
 * Solo cuenta. No compara con "lo normal", no marca nada como alto o bajo y no
 * sugiere ninguna acción.
 */
export function DailySummary({ items }: { items: TimelineItem[] }) {
  const t = useT();

  const cuenta = (tipo: TimelineItem['type']) =>
    items.filter((item) => item.type === tipo).length;

  return (
    <Card>
      <Text variant="subtitle">{t('today.summary')}</Text>

      <View style={styles.rejilla}>
        <StatTile
          value={cuenta('breastfeed')}
          label={t('timeline.breastfeed')}
          tone="breastfeed"
          icon="water-outline"
        />
        <StatTile
          value={cuenta('food_entry')}
          label={t('timeline.foodEntry')}
          tone="feeding"
          icon="restaurant-outline"
        />
        <StatTile
          value={cuenta('diaper_event')}
          label={t('timeline.diaper')}
          tone="diaper"
          icon="happy-outline"
        />
        <StatTile
          value={cuenta('symptom')}
          label={t('timeline.symptom')}
          tone="symptom"
          icon="eye-outline"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
