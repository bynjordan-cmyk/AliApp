import { addMonths, format } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Card,
  Chip,
  Text,
  colors,
  radius,
  spacing,
  surfaces,
  touchTarget,
} from '@/design-system';
import { TimelineRail } from '@/features/timeline/TimelineRail';
import { useTimeline } from '@/features/timeline/useTimeline';
import { useJourneys } from '@/features/journeys/useJourneys';
import { localDayKey } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { groupByDay } from '@/features/timeline/timeline.mapper';

import {
  CALENDAR_LAYERS,
  buildMonth,
  type CalendarDay,
  type CalendarLayer,
} from './calendar-model';

const LOCALES = { es, en: enUS } as const;

/**
 * Calendario de evolución.
 *
 * Cada día muestra un número —cuántos registros hay— y marcas de hito. El
 * color acompaña, pero el dato está en el número y en el texto: nadie tiene
 * que distinguir tonos para entender el mes (§21).
 */
export function EvolutionCalendar({ babyId }: { babyId: string }) {
  const { t, locale } = useI18n();
  const [mes, setMes] = useState(() => new Date());
  const [capas, setCapas] = useState<CalendarLayer[]>([...CALENDAR_LAYERS]);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);

  const rango = useMemo(() => {
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1);
    inicio.setDate(inicio.getDate() - 7);
    const fin = new Date(mes.getFullYear(), mes.getMonth() + 1, 1);
    fin.setDate(fin.getDate() + 7);
    return { from: inicio.toISOString(), to: fin.toISOString() };
  }, [mes]);

  const timeline = useTimeline(babyId, rango);
  const journeys = useJourneys(babyId);

  const items = useMemo(
    () => timeline.days.flatMap((day) => day.items),
    [timeline.days],
  );

  const dias = useMemo(
    () => buildMonth(mes, items, journeys.data ?? [], capas),
    [mes, items, journeys.data, capas],
  );

  const itemsDelDia = diaElegido
    ? items.filter((item) => localDayKey(item.occurredAt) === diaElegido)
    : [];

  return (
    <View style={styles.root}>
      <Card>
        <View style={styles.cabecera}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar.previousMonth')}
            onPress={() => setMes(addMonths(mes, -1))}
            style={styles.navegacion}
          >
            <Text variant="bodyStrong" color={colors.brand}>
              ‹
            </Text>
          </Pressable>

          <Text variant="subtitle">
            {format(mes, 'LLLL yyyy', { locale: LOCALES[locale] })}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar.nextMonth')}
            onPress={() => setMes(addMonths(mes, 1))}
            style={styles.navegacion}
          >
            <Text variant="bodyStrong" color={colors.brand}>
              ›
            </Text>
          </Pressable>
        </View>

        <View style={styles.capas}>
          {CALENDAR_LAYERS.map((capa) => (
            <Chip
              key={capa}
              label={t(`calendar.layer.${capa}` as 'calendar.layer.symptoms')}
              selected={capas.includes(capa)}
              onPress={() =>
                setCapas((actual) =>
                  actual.includes(capa)
                    ? actual.filter((c) => c !== capa)
                    : [...actual, capa],
                )
              }
            />
          ))}
        </View>

        <View style={styles.rejilla}>
          {dias.map((dia) => (
            <DiaCelda
              key={dia.dayKey}
              dia={dia}
              elegido={diaElegido === dia.dayKey}
              onPress={() => setDiaElegido(diaElegido === dia.dayKey ? null : dia.dayKey)}
              etiquetaHitos={t('calendar.milestone')}
            />
          ))}
        </View>

        <Text variant="caption" color={colors.textSecondary}>
          {t('calendar.legend')}
        </Text>
      </Card>

      {diaElegido ? (
        <Card>
          <Text variant="subtitle">{diaElegido}</Text>
          {itemsDelDia.length === 0 ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('calendar.emptyDay')}
            </Text>
          ) : (
            <TimelineRail days={groupByDay(itemsDelDia)} />
          )}
        </Card>
      ) : null}
    </View>
  );
}

function DiaCelda({
  dia,
  elegido,
  onPress,
  etiquetaHitos,
}: {
  dia: CalendarDay;
  elegido: boolean;
  onPress: () => void;
  etiquetaHitos: string;
}) {
  const tieneHitos = dia.milestones.length > 0;
  const destacado = dia.milestones.includes('review') || dia.milestones.includes('start');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: elegido }}
      accessibilityLabel={`${dia.date.getDate()}, ${dia.total} · ${tieneHitos ? etiquetaHitos : ''}`}
      onPress={onPress}
      style={[
        styles.celda,
        !dia.inMonth && styles.fuera,
        elegido && styles.elegida,
        destacado && { borderColor: surfaces.journey.accent, borderWidth: 2 },
      ]}
    >
      <Text variant="caption" color={dia.inMonth ? colors.textPrimary : colors.textSecondary}>
        {dia.date.getDate()}
      </Text>

      {dia.total > 0 ? (
        <Text variant="overline" color={colors.textSecondary}>
          {dia.total}
        </Text>
      ) : null}

      {tieneHitos ? <View style={styles.hito} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navegacion: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
  celda: {
    width: `${100 / 7 - 1}%`,
    minHeight: touchTarget.min,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  fuera: { opacity: 0.4 },
  elegida: { backgroundColor: colors.accentSoft },
  hito: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: surfaces.journey.accent,
    marginTop: spacing.xxs,
  },
});
