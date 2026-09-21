import { endOfDay, startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  QueryState,
  PageHeader,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  Text,
  colors,
  spacing,
  useLayout,
} from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { BabySelector } from '@/features/baby/BabySelector';
import { useActiveJourneys } from '@/features/journeys/useJourneys';
import { DailySummary } from '@/features/today/DailySummary';
import { QuickLogFab } from '@/features/today/QuickLogFab';
import { TimelineList } from '@/features/timeline/TimelineList';
import { useTimeline } from '@/features/timeline/useTimeline';
import { useT } from '@/lib/i18n';

/** Ancho de la vista de dos columnas en escritorio. */
const WIDE_LAYOUT_WIDTH = 1080;

/**
 * Pantalla Hoy (§14).
 *
 * Muestra hechos del día y da acceso inmediato al registro rápido. En pantalla
 * ancha se reparte en dos columnas —contexto a la izquierda, línea de tiempo a
 * la derecha— en lugar de apilar todo en una tira vertical.
 *
 * La tarjeta "qué ha cambiado" solo mostrará deltas descriptivos: nunca una
 * conclusión.
 */
export default function TodayScreen() {
  const t = useT();
  const { baby } = useActiveBaby();
  const { isDesktop } = useLayout();

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

  const context = (
    <View style={styles.stack}>
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
    </View>
  );

  const timelineBlock = (
    <View style={styles.stack}>
      <SectionHeader title={t('today.timeline')} />
      <QueryState
        loading={timeline.isLoading}
        error={timeline.isError}
        onRetry={() => {
          void timeline.refetch();
        }}
      >
        <TimelineList days={timeline.days} />
      </QueryState>
    </View>
  );

  return (
    <View style={styles.root}>
      <Screen maxWidth={isDesktop ? WIDE_LAYOUT_WIDTH : undefined} bottomSpace={spacing.xxxl * 2}>
        <PageHeader title={t('today.title')} icon="sunny-outline" />
        <BabySelector />

        {isDesktop ? (
          <View style={styles.columns}>
            <View style={styles.contextColumn}>{context}</View>
            <View style={styles.timelineColumn}>{timelineBlock}</View>
          </View>
        ) : (
          <>
            {context}
            {timelineBlock}
          </>
        )}

        <Text variant="caption" color={colors.textSecondary}>
          {t('safety.notDiagnostic')}
        </Text>
      </Screen>

      <QuickLogFab maxWidth={isDesktop ? WIDE_LAYOUT_WIDTH : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stack: { gap: spacing.lg },
  columns: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' },
  contextColumn: { flex: 1, minWidth: 280 },
  timelineColumn: { flex: 1.1, minWidth: 320 },
});
