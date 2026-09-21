import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Divider, EmptyState, ListItem, Text, colors, eventColors, spacing } from '@/design-system';
import { useFoodNames } from '@/features/food/useFoodNames';
import { formatDayHeading, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { TimelineDay, TimelineItemType } from '@/types/timeline';

import { timelineSubtitle } from './timeline-labels';

/**
 * Línea de tiempo unificada, agrupada por día y ordenada por `occurred_at`.
 * Cada tipo tiene color propio, siempre acompañado del título en texto (§21).
 */

const TINT_BY_TYPE: Record<TimelineItemType, string> = {
  food_entry: eventColors.food,
  breastfeed: eventColors.breastfeed,
  diaper_event: eventColors.diaper,
  symptom: eventColors.symptom,
  reaction_episode: eventColors.episode,
  medication_event: eventColors.medication,
};

export function TimelineList({ days }: { days: TimelineDay[] }) {
  const { locale, t } = useI18n();
  const { nameForKey } = useFoodNames();
  const router = useRouter();

  if (days.length === 0) {
    return <EmptyState title={t('common.empty')} description={t('timeline.emptyDay')} />;
  }

  return (
    <View style={styles.root}>
      {days.map((day) => (
        <View key={day.dayKey} style={styles.day}>
          <Text variant="overline" color={colors.textSecondary}>
            {formatDayHeading(day.items[0]?.occurredAt ?? day.dayKey, locale).toUpperCase()}
          </Text>
          <Divider />
          {day.items.map((item) => (
            <ListItem
              key={`${item.type}-${item.id}`}
              title={t(item.title)}
              subtitle={timelineSubtitle(item, t, nameForKey) ?? undefined}
              meta={formatTime(item.occurredAt, locale)}
              tint={TINT_BY_TYPE[item.type]}
              onPress={() => router.push(`/record/${item.type}/${item.id}`)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xl },
  day: { gap: spacing.xs },
});
