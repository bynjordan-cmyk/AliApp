import { endOfDay, startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Screen, SectionHeader, Text, colors } from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { BabySelector } from '@/features/baby/BabySelector';
import { useActiveJourneys } from '@/features/journeys/useJourneys';
import { DailySummary } from '@/features/today/DailySummary';
import { QuickLogFab } from '@/features/today/QuickLogFab';
import { TimelineList } from '@/features/timeline/TimelineList';
import { useTimeline } from '@/features/timeline/useTimeline';
import { useT } from '@/lib/i18n';

/**
 * Pantalla Hoy (§14).
 *
 * Muestra hechos del día y da acceso inmediato al registro rápido. La tarjeta
 * "qué ha cambiado" solo mostrará deltas descriptivos: nunca una conclusión.
 */
export default function TodayScreen() {
  const t = useT();
  const { baby } = useActiveBaby();

  const range = useMemo(() => {
    const now = new Date();
    return {
      from: startOfDay(subDays(now, 2)).toISOString(),
      to: endOfDay(now).toISOString(),
    };
  }, []);

  const timeline = useTimeline(baby?.id ?? null, range);
  const journeys = useActiveJourneys(baby?.id ?? null);
  const todayItems = timeline.days[0]?.items ?? [];

  if (!baby) {
    return (
      <Screen>
        <EmptyState title={t('today.noBaby')} description={t('safety.notDiagnostic')} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Text variant="display">{t('today.title')}</Text>
        <BabySelector />

        <DailySummary items={todayItems} />

        <Card tone={journeys.data && journeys.data.length > 0 ? 'calm' : 'plain'}>
          <Text variant="subtitle">{t('today.activeJourney')}</Text>
          {journeys.data && journeys.data.length > 0 ? (
            journeys.data.map((journey) => (
              <Text key={journey.id}>
                {t(`journeys.type.${journey.journey_type}` as const)} ·{' '}
                {t(`journeys.status.${journey.status}` as const)}
              </Text>
            ))
          ) : (
            <Text color={colors.textSecondary}>{t('today.noActiveJourney')}</Text>
          )}
        </Card>

        <Card tone="highlight">
          <Text variant="subtitle">{t('today.changes')}</Text>
          <Text color={colors.textSecondary}>{t('today.changesPlaceholder')}</Text>
        </Card>

        <SectionHeader title={t('today.timeline')} />
        {timeline.isLoading ? (
          <Text>{t('common.loading')}</Text>
        ) : (
          <TimelineList days={timeline.days} />
        )}

        <Text variant="caption" color={colors.textSecondary}>
          {t('safety.notDiagnostic')}
        </Text>
      </Screen>

      <QuickLogFab />
    </View>
  );
}
