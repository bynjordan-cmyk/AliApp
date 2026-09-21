import { endOfDay, startOfDay, subDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  Chip,
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
import { RemindersCard } from '@/features/dashboard/RemindersCard';
import { SummaryBlocks } from '@/features/dashboard/SummaryBlocks';
import { WeekStrip } from '@/features/dashboard/WeekStrip';
import { buildDailySummary } from '@/features/dashboard/daily-summary';
import { useActiveJourneys } from '@/features/journeys/useJourneys';
import { useReminders } from '@/features/notifications/useReminders';
import { QuickLogFab } from '@/features/today/QuickLogFab';
import { buildHighlight } from '@/features/today/highlight';
import { TimelineRail } from '@/features/timeline/TimelineRail';
import { useTimeline } from '@/features/timeline/useTimeline';
import { localDayKey } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

const WIDE_LAYOUT_WIDTH = 1080;

/**
 * Inicio · el dashboard de AliApp.
 *
 * Orden deliberado, de lo urgente a lo ocurrido:
 *   1. qué necesita atención  → "Lo importante ahora"
 *   2. cómo va el día         → resumen por bloques
 *   3. qué está próximo       → recordatorios
 *   4. qué ocurrió            → línea de tiempo, al final
 *
 * "Hoy" deja de ser el nombre de la pestaña y pasa a ser una fecha dentro del
 * dashboard: se puede mirar ayer, o cualquier día de la semana.
 *
 * Nada de lo que muestra es un diagnóstico: son hechos contados y ordenados.
 */
export default function HomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { baby } = useActiveBaby();
  const { isDesktop } = useLayout();

  const hoyKey = localDayKey(new Date());
  const [fecha, setFecha] = useState(() => new Date());
  const diaKey = localDayKey(fecha);

  // Se consultan varios días para poder pintar la semana y cambiar de fecha
  // sin volver a pedir datos.
  const rango = useMemo(() => {
    const ahora = new Date();
    return {
      from: startOfDay(subDays(ahora, 7)).toISOString(),
      to: endOfDay(ahora).toISOString(),
    };
  }, []);

  const timeline = useTimeline(baby?.id ?? null, rango);
  const journeys = useActiveJourneys(baby?.id ?? null);
  const reminders = useReminders();

  const todosLosItems = useMemo(
    () => timeline.days.flatMap((day) => day.items),
    [timeline.days],
  );

  const itemsDelDia = useMemo(
    () => todosLosItems.filter((item) => localDayKey(item.occurredAt) === diaKey),
    [todosLosItems, diaKey],
  );

  const diasDelDia = useMemo(
    () => timeline.days.filter((day) => day.dayKey === diaKey),
    [timeline.days, diaKey],
  );

  const summary = useMemo(
    () =>
      buildDailySummary({
        dayKey: diaKey,
        items: itemsDelDia,
        journeys: journeys.data ?? [],
        reminders: reminders.data ?? [],
      }),
    [diaKey, itemsDelDia, journeys.data, reminders.data],
  );

  const highlight = useMemo(
    () =>
      buildHighlight({
        items: itemsDelDia,
        journeys: journeys.data ?? [],
        reminders: reminders.data ?? [],
      }),
    [itemsDelDia, journeys.data, reminders.data],
  );

  if (!baby) {
    return (
      <Screen>
        <PageHeader title={t('home.title')} />
        <EmptyState title={t('today.noBaby')} description={t('today.noBabyHint')} />
      </Screen>
    );
  }

  const esHoy = diaKey === hoyKey;
  const esAyer = diaKey === localDayKey(subDays(new Date(), 1));

  const atencionYResumen = (
    <View style={styles.stack}>
      <HeroCard
        eyebrow={t('today.highlight.eyebrow')}
        title={t(highlight.titleKey)}
        description={t(highlight.bodyKey, highlight.params)}
        icon={highlight.icon}
        tone={highlight.tone}
      />

      <SectionHeader title={t('home.summary')} />
      <SummaryBlocks summary={summary} />

      <RemindersCard
        reminders={summary.upcomingReminders}
        generatedAt={summary.generatedAt}
      />
    </View>
  );

  const loOcurrido = (
    <View style={styles.stack}>
      <SectionHeader title={t('home.timelineTitle')} subtitle={t('today.timelineHint')} />
      <QueryState
        loading={timeline.isLoading}
        error={timeline.isError}
        onRetry={() => {
          void timeline.refetch();
        }}
      >
        {diasDelDia.length === 0 ? (
          <EmptyState title={t('timeline.emptyDay')} description={t('timeline.emptyHint')} />
        ) : (
          <TimelineRail days={diasDelDia} />
        )}
      </QueryState>
    </View>
  );

  return (
    <View style={styles.root}>
      <Screen maxWidth={isDesktop ? WIDE_LAYOUT_WIDTH : undefined} bottomSpace={spacing.xxxl * 2}>
        <PageHeader title={t('home.title')} />
        <BabySelector />

        {/* Navegación de fecha */}
        <View style={styles.fechas}>
          <Chip label={t('home.today')} selected={esHoy} onPress={() => setFecha(new Date())} />
          <Chip
            label={t('home.yesterday')}
            selected={esAyer}
            onPress={() => setFecha(subDays(new Date(), 1))}
          />
          <Chip label={t('home.openCalendar')} onPress={() => router.push('/calendar')} />
        </View>

        <Card>
          <SectionHeader title={t('home.week')} />
          <WeekStrip
            items={todosLosItems}
            selectedDayKey={diaKey}
            onSelectDay={(_clave, dia) => setFecha(dia)}
          />
        </Card>

        {isDesktop ? (
          <View style={styles.columns}>
            <View style={styles.contextColumn}>{atencionYResumen}</View>
            <View style={styles.timelineColumn}>{loOcurrido}</View>
          </View>
        ) : (
          <>
            {atencionYResumen}
            {loOcurrido}
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
  fechas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  columns: { flexDirection: 'row', gap: spacing.xl, alignItems: 'flex-start' },
  contextColumn: { flex: 1, minWidth: 280 },
  timelineColumn: { flex: 1.1, minWidth: 320 },
});
