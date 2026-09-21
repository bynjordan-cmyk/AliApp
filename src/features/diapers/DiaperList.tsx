import { Ionicons } from '@expo/vector-icons';
import { subHours } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Card,
  Chip,
  EmptyState,
  QueryState,
  Text,
  colors,
  radius,
  spacing,
  surfaces,
} from '@/design-system';
import { useFoodNames } from '@/features/food/useFoodNames';
import { MediaStrip } from '@/features/media/MediaStrip';
import { timelineSubtitle } from '@/features/timeline/timeline-labels';
import { useTimeline } from '@/features/timeline/useTimeline';
import { formatDate, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { DiaperEvent } from '@/types/domain';

import {
  CROSS_LOG_WINDOWS_HOURS,
  buildCrossLog,
  groupBySubject,
  type CrossLogWindowHours,
} from './cross-log';
import { useDiapers } from './useDiapers';

/**
 * Pañales, con la acción "Ver qué comió antes".
 *
 * El cruce muestra lo registrado en las horas previas y cuánto antes ocurrió.
 * No dice, ni insinúa, que nada de eso haya provocado lo observado.
 */
export function DiaperList({ babyId }: { babyId: string }) {
  const { t } = useI18n();
  const diapers = useDiapers(babyId);
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <QueryState
      loading={diapers.isLoading}
      error={diapers.isError}
      onRetry={() => {
        void diapers.refetch();
      }}
    >
      {(diapers.data ?? []).length === 0 ? (
        <EmptyState title={t('health.noDiapers')} description={t('health.noDiapersHint')} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {(diapers.data ?? []).map((diaper) => (
            <DiaperCard
              key={diaper.id}
              diaper={diaper}
              babyId={babyId}
              expandido={abierto === diaper.id}
              onToggle={() => setAbierto(abierto === diaper.id ? null : diaper.id)}
            />
          ))}
        </View>
      )}
    </QueryState>
  );
}

function DiaperCard({
  diaper,
  babyId,
  expandido,
  onToggle,
}: {
  diaper: DiaperEvent;
  babyId: string;
  expandido: boolean;
  onToggle: () => void;
}) {
  const { t, locale } = useI18n();
  const { nameForKey } = useFoodNames();
  const [ventana, setVentana] = useState<CrossLogWindowHours>(12);
  const tone = surfaces.diaper;

  // Solo se consulta cuando la tarjeta está abierta: nadie paga por datos que
  // no está mirando.
  const rango = {
    from: subHours(new Date(diaper.occurred_at), 24).toISOString(),
    to: diaper.occurred_at,
  };
  const timeline = useTimeline(expandido ? babyId : null, rango);
  const cruce = groupBySubject(
    buildCrossLog(
      timeline.days.flatMap((day) => day.items),
      diaper.occurred_at,
      ventana,
    ),
  );

  const detalles: { etiqueta: string; valor: string }[] = [];
  const añadir = (etiqueta: string, valor: string | null | undefined) => {
    if (valor) detalles.push({ etiqueta, valor });
  };
  añadir(t('diaper.consistency'), diaper.stool_consistency);
  añadir(t('diaper.color'), diaper.stool_color);
  if (diaper.stool_amount) {
    añadir(t('diaper.amount'), t(`diaper.amount_${diaper.stool_amount}` as 'diaper.amount_scant'));
  }
  if (diaper.mucus) añadir(t('diaper.mucus'), t('common.yes'));
  if (diaper.blood_observed) añadir(t('diaper.blood'), t('common.yes'));
  if (diaper.visible_food_residue) añadir(t('diaper.foodResidue'), t('common.yes'));
  if (diaper.straining) añadir(t('diaper.straining'), t('common.yes'));
  if (diaper.unusual_odor) añadir(t('diaper.odor'), t('common.yes'));
  añadir(t('common.notes'), diaper.notes);

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: expandido }}
        onPress={onToggle}
        style={styles.cabecera}
      >
        <View style={[styles.icono, { backgroundColor: tone.background }]}>
          <Ionicons name="happy-outline" size={18} color={tone.ink} accessible={false} />
        </View>
        <View style={styles.titulo}>
          <Text variant="bodyStrong">{t(`diaper.${diaper.diaper_type}` as 'diaper.urine')}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {formatDate(diaper.occurred_at, locale)} · {formatTime(diaper.occurred_at, locale)}
          </Text>
        </View>
      </Pressable>

      {expandido ? (
        <View style={styles.detalle}>
          {detalles.map((detalle) => (
            <View key={detalle.etiqueta} style={styles.fila}>
              <Text variant="caption" color={colors.textSecondary}>
                {detalle.etiqueta}
              </Text>
              <Text variant="caption">{detalle.valor}</Text>
            </View>
          ))}

          <MediaStrip entityType="diaper_event" entityId={diaper.id} category="diaper" />

          <Text variant="subtitle">{t('diaper.whatBefore')}</Text>
          <View style={styles.ventanas}>
            {CROSS_LOG_WINDOWS_HOURS.map((horas) => (
              <Chip
                key={horas}
                label={t('reactions.windowLabel', { hours: horas })}
                selected={ventana === horas}
                onPress={() => setVentana(horas)}
              />
            ))}
          </View>

          {(['baby', 'caregiver'] as const).map((sujeto) => (
            <View key={sujeto} style={styles.grupo}>
              <Text variant="caption" color={colors.textSecondary}>
                {sujeto === 'baby' ? t('food.babyLog') : t('food.caregiverLog')}
              </Text>

              {cruce[sujeto].length === 0 ? (
                <Text variant="caption" color={colors.textSecondary}>
                  {t('diaper.nothingBefore')}
                </Text>
              ) : (
                cruce[sujeto].map(({ item, minutesBefore }) => (
                  <Text key={`${item.type}-${item.id}`} variant="caption">
                    {timelineSubtitle(item, t, nameForKey) ?? t(item.title)} ·{' '}
                    {Math.floor(minutesBefore / 60)} {t('common.hoursShort')} {minutesBefore % 60}{' '}
                    {t('common.minutesShort')} {t('diaper.beforeThis')}
                  </Text>
                ))
              )}
            </View>
          ))}

          <Text variant="caption" color={colors.textSecondary}>
            {t('diaper.noCausality')}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  icono: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { flex: 1, gap: spacing.xxs },
  detalle: { gap: spacing.sm, marginTop: spacing.sm },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  ventanas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  grupo: { gap: spacing.xxs },
});
