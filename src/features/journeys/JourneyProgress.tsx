import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Text, colors, radius, spacing, surfaces } from '@/design-system';
import { formatDate } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { Journey } from '@/types/domain';

/**
 * Progreso de un proceso.
 *
 * Los pasos son los que tienen FECHA REGISTRADA. AliApp no fija cuánto dura
 * una observación ni cuándo toca reintroducir: esas fechas las pone quien
 * indica el plan, y si no están, el paso se muestra sin fecha (§12).
 */

type Paso = {
  key: 'baseline' | 'start' | 'observation' | 'review' | 'close';
  label: string;
  date: string | null;
  done: boolean;
};

export function JourneyProgress({ journey }: { journey: Journey }) {
  const { t, locale } = useI18n();
  const hoy = new Date();

  const inicio = journey.started_on ? new Date(`${journey.started_on}T00:00:00`) : null;
  const revision = journey.review_on ? new Date(`${journey.review_on}T00:00:00`) : null;
  const cierre = journey.completed_on ? new Date(`${journey.completed_on}T00:00:00`) : null;

  const esReintroduccion = journey.journey_type === 'reintroduction';

  const pasos: Paso[] = [
    {
      key: 'baseline',
      label: t('journeys.step.baseline'),
      date: null,
      done: Boolean(inicio),
    },
    {
      key: 'start',
      label: t('journeys.step.start'),
      date: journey.started_on,
      done: Boolean(inicio && inicio <= hoy),
    },
    {
      key: 'observation',
      label: t('journeys.step.observation'),
      date: null,
      done: journey.status === 'active' || Boolean(cierre),
    },
    {
      key: 'review',
      label: t('journeys.step.review'),
      date: journey.review_on,
      done: Boolean(revision && revision <= hoy),
    },
    {
      key: 'close',
      label: esReintroduccion ? t('journeys.step.reintroduction') : t('journeys.step.close'),
      date: journey.completed_on,
      done: Boolean(cierre),
    },
  ];

  return (
    <View style={styles.root}>
      {pasos.map((paso, index) => (
        <View key={paso.key} style={styles.paso}>
          <View style={styles.marcador}>
            <View
              style={[
                styles.punto,
                paso.done
                  ? { backgroundColor: surfaces.journey.accent }
                  : { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
              ]}
            >
              {paso.done ? (
                <Ionicons name="checkmark" size={12} color={colors.textOnAccent} accessible={false} />
              ) : null}
            </View>
            {index < pasos.length - 1 ? <View style={styles.linea} /> : null}
          </View>

          <View style={styles.texto}>
            <Text variant="caption" color={paso.done ? colors.textPrimary : colors.textSecondary}>
              {paso.label}
            </Text>
            {paso.date ? (
              <Text variant="overline" color={colors.textSecondary}>
                {formatDate(paso.date, locale)}
              </Text>
            ) : (
              <Text variant="overline" color={colors.textSecondary}>
                {t('journeys.noDateSet')}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 0, marginTop: spacing.sm },
  paso: { flexDirection: 'row', gap: spacing.md },
  marcador: { alignItems: 'center', width: 24 },
  punto: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linea: { width: 2, flex: 1, minHeight: 18, backgroundColor: colors.border },
  texto: { flex: 1, paddingBottom: spacing.md, gap: spacing.xxs },
});
