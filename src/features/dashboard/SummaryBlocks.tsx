import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card, Text, colors, radius, spacing, surfaces, type SurfaceTone } from '@/design-system';
import { formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

import type { DailySummary } from './daily-summary';

/**
 * Resumen del día por bloques.
 *
 * No son contadores sueltos: cada bloque cuenta lo que pasó y añade el dato
 * contextual que una madre busca de verdad (a qué hora fue lo último, cuántas
 * primeras veces hubo). Nada de esto valora si el día fue bueno o malo.
 */
export function SummaryBlocks({ summary }: { summary: DailySummary }) {
  const { t, locale } = useI18n();

  const bloques: {
    key: string;
    tone: SurfaceTone;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    lines: string[];
  }[] = [
    {
      key: 'feeding',
      tone: 'feeding',
      icon: 'restaurant-outline',
      title: t('home.feeding'),
      lines: [
        `${summary.feeding.breastfeeds} · ${t('timeline.breastfeed')}`,
        summary.feeding.breastfeedMinutes > 0
          ? `${summary.feeding.breastfeedMinutes} ${t('home.breastfeedMinutes')}`
          : '',
        `${summary.feeding.babyMeals} · ${t('timeline.foodEntry')}`,
        summary.feeding.firstExposures > 0
          ? `${summary.feeding.firstExposures} · ${t('home.firstExposures')}`
          : '',
        summary.feeding.lastFeedAt
          ? `${t('home.lastFeed')}: ${formatTime(summary.feeding.lastFeedAt, locale)}`
          : '',
      ].filter(Boolean),
    },
    {
      key: 'health',
      tone: 'symptom',
      icon: 'eye-outline',
      title: t('home.health'),
      lines: [
        `${summary.health.symptoms} · ${t('timeline.symptom')}`,
        summary.health.openEpisodes > 0
          ? `${summary.health.openEpisodes} · ${t('home.openEpisodes')}`
          : '',
        summary.health.medications > 0
          ? `${summary.health.medications} · ${t('timeline.medication')}`
          : '',
        summary.health.lastSymptomAt
          ? `${t('home.lastSymptom')}: ${formatTime(summary.health.lastSymptomAt, locale)}`
          : '',
      ].filter(Boolean),
    },
    {
      key: 'diapers',
      tone: 'diaper',
      icon: 'happy-outline',
      title: t('home.diapers'),
      lines: [
        `${summary.diapers.total} · ${t('timeline.diaper')}`,
        summary.diapers.stool > 0 ? `${summary.diapers.stool} · ${t('home.stool')}` : '',
        summary.diapers.withMucus > 0 ? `${summary.diapers.withMucus} · ${t('diaper.mucus')}` : '',
        summary.diapers.withBlood > 0 ? `${summary.diapers.withBlood} · ${t('diaper.blood')}` : '',
        summary.diapers.lastAt
          ? `${t('home.lastDiaper')}: ${formatTime(summary.diapers.lastAt, locale)}`
          : '',
      ].filter(Boolean),
    },
  ];

  if (summary.activeJourneys.length > 0) {
    bloques.push({
      key: 'journey',
      tone: 'journey',
      icon: 'map-outline',
      title: t('home.journey'),
      lines: summary.activeJourneys.map(
        (journey) =>
          `${t(`journeys.type.${journey.journey_type}` as const)}${
            journey.review_on ? ` · ${t('journeys.reviewOn')}: ${journey.review_on}` : ''
          }`,
      ),
    });
  }

  return (
    <View style={styles.rejilla}>
      {bloques.map((bloque) => {
        const tone = surfaces[bloque.tone];

        return (
          <Card key={bloque.key} style={styles.bloque}>
            <View style={styles.cabecera}>
              <View style={[styles.icono, { backgroundColor: tone.background }]}>
                <Ionicons name={bloque.icon} size={18} color={tone.ink} accessible={false} />
              </View>
              <Text variant="bodyStrong">{bloque.title}</Text>
            </View>

            {bloque.lines.length === 0 ? (
              <Text variant="caption" color={colors.textSecondary}>
                {t('home.nothingYet')}
              </Text>
            ) : (
              bloque.lines.map((linea) => (
                <Text key={linea} variant="caption" color={colors.textSecondary}>
                  {linea}
                </Text>
              ))
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rejilla: { gap: spacing.md },
  bloque: { gap: spacing.xs },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icono: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
