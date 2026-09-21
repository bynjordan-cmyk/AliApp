import { endOfDay, startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  EmptyState,
  HeroCard,
  PageHeader,
  QueryState,
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
import { buildHighlight } from '@/features/today/highlight';
import { TimelineRail } from '@/features/timeline/TimelineRail';
import { useTimeline } from '@/features/timeline/useTimeline';
import { useI18n } from '@/lib/i18n';

/** Ancho de la vista de dos columnas en escritorio. */
const WIDE_LAYOUT_WIDTH = 1080;

/**
 * Pantalla Hoy (§14).
 *
 * Abre con un hecho del día —"Lo importante hoy"—, sigue con el recuento de lo
 * registrado y termina con la línea de tiempo narrada. Nada de todo eso
 * interpreta: describe.
 */
export default function TodayScreen() {
  const { t } = useI18n();
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
  const todayItems = useMemo(() => timeline.days[0]?.items ?? [], [timeline.days]);

  const highlight = useMemo(
    () => buildHighlight({ items: todayItems, journeys: journeys.data ?? [] }),
    [todayItems, journeys.data],
  );

  if (!baby) {
    return (
      <Screen>
        <PageHeader title={t('today.title')} />
        <EmptyState title={t('today.noBaby')} description={t('today.noBabyHint')} />
      </Screen>
    );
  }

  const contexto = (
    <View style={styles.stack}>
      <HeroCard
        eyebrow={t('today.highlight.eyebrow')}
        title={t(highlight.titleKey)}
        description={t(highlight.bodyKey, highlight.params)}
        icon={highlight.icon}
        tone={highlight.tone}
      />

      <DailySummary items={todayItems} />

      <Card tone="calm">
        <Text variant="subtitle">{t('today.changes')}</Text>
        <Text color={colors.textSecondary}>{t('today.changesPlaceholder')}</Text>
      </Card>
    </View>
  );

  const lineaDeTiempo = (
    <View style={styles.stack}>
      <SectionHeader title={t('today.timeline')} subtitle={t('today.timelineHint')} />
      <QueryState
        loading={timeline.isLoading}
        error={timeline.isError}
        onRetry={() => {
          void timeline.refetch();
        }}
      >
        {timeline.days.length === 0 ? (
          <EmptyState title={t('timeline.emptyDay')} description={t('timeline.emptyHint')} />
        ) : (
          <TimelineRail days={timeline.days} />
        )}
      </QueryState>
    </View>
  );

  return (
    <View style={styles.root}>
      <Screen maxWidth={isDesktop ? WIDE_LAYOUT_WIDTH : undefined} bottomSpace={spacing.xxxl * 2}>
        <PageHeader title={t('today.title')} />
        <BabySelector />

        {isDesktop ? (
          <View style={styles.columns}>
            <View style={styles.contextColumn}>{contexto}</View>
            <View style={styles.timelineColumn}>{lineaDeTiempo}</View>
          </View>
        ) : (
          <>
            {contexto}
            {lineaDeTiempo}
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
