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
} from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { BabySelector } from '@/features/baby/BabySelector';
import { useJourneys } from '@/features/journeys/useJourneys';
import { formatDate } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

/**
 * Pestaña Procesos (§12, §14).
 *
 * Un proceso organiza los datos existentes: mientras está activo, el registro
 * diario no cambia. Las fechas las decide quien indica el plan; AliApp no fija
 * duraciones clínicas.
 */
export default function JourneysScreen() {
  const { t, locale } = useI18n();
  const { baby } = useActiveBaby();
  const journeys = useJourneys(baby?.id ?? null);

  if (!baby) {
    return (
      <Screen>
        <EmptyState title={t('today.noBaby')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={t('journeys.title')} icon="map-outline" />
      <BabySelector />

      <SectionHeader title={t('journeys.active')} />

      <QueryState
        loading={journeys.isLoading}
        error={journeys.isError}
        onRetry={() => {
          void journeys.refetch();
        }}
      >
        {(journeys.data ?? []).length === 0 ? (
          <EmptyState title={t('today.noActiveJourney')} />
        ) : (
          (journeys.data ?? []).map((journey) => (
            <Card key={journey.id} tone={journey.status === 'active' ? 'calm' : 'plain'}>
              <Text variant="subtitle">{t(`journeys.type.${journey.journey_type}` as const)}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                {t(`journeys.status.${journey.status}` as const)} · {t('journeys.indicatedBy')}:{' '}
                {t(`journeys.by.${journey.indicated_by}`)}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {formatDate(journey.started_on, locale)}
                {journey.review_on
                  ? ` → ${t('journeys.reviewOn')}: ${formatDate(journey.review_on, locale)}`
                  : ''}
              </Text>
              {journey.notes ? <Text>{journey.notes}</Text> : null}
            </Card>
          ))
        )}
      </QueryState>
      <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
        {t('safety.consultProfessional')}
      </Text>
    </Screen>
  );
}
