import { useState } from 'react';
import { View } from 'react-native';

import {
  Card,
  Chip,
  EmptyState,
  PageHeader,
  QueryState,
  Screen,
  Text,
  colors,
  spacing,
} from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { BabySelector } from '@/features/baby/BabySelector';
import { EvolutionCalendar } from '@/features/calendar/EvolutionCalendar';
import { JourneyProgress } from '@/features/journeys/JourneyProgress';
import { useJourneys } from '@/features/journeys/useJourneys';
import { formatDate } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

type JourneyTab = 'list' | 'calendar';

/**
 * Pestaña Procesos (§12, §14).
 *
 * Un proceso organiza los datos existentes: mientras está activo, el registro
 * diario no cambia. Las fechas las decide quien indica el plan; AliApp no fija
 * duraciones clínicas ni sugiere cuándo reintroducir.
 */
export default function JourneysScreen() {
  const { t, locale } = useI18n();
  const { baby } = useActiveBaby();
  const [tab, setTab] = useState<JourneyTab>('list');
  const journeys = useJourneys(baby?.id ?? null);

  if (!baby) {
    return (
      <Screen>
        <PageHeader title={t('journeys.title')} />
        <EmptyState title={t('today.noBaby')} description={t('today.noBabyHint')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={t('journeys.title')} />
      <BabySelector />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Chip label={t('journeys.active')} selected={tab === 'list'} onPress={() => setTab('list')} />
        <Chip
          label={t('calendar.title')}
          selected={tab === 'calendar'}
          onPress={() => setTab('calendar')}
        />
      </View>

      {tab === 'calendar' ? <EvolutionCalendar babyId={baby.id} /> : null}

      {tab === 'list' ? (
        <QueryState
          loading={journeys.isLoading}
          error={journeys.isError}
          onRetry={() => {
            void journeys.refetch();
          }}
        >
          {(journeys.data ?? []).length === 0 ? (
            <EmptyState title={t('journeys.empty')} description={t('journeys.emptyHint')} />
          ) : (
            <View style={{ gap: spacing.md }}>
              {(journeys.data ?? []).map((journey) => (
                <Card key={journey.id} tone={journey.status === 'active' ? 'calm' : 'plain'}>
                  <Text variant="subtitle">
                    {t(`journeys.type.${journey.journey_type}` as const)}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {t(`journeys.status.${journey.status}` as const)} · {t('journeys.indicatedBy')}:{' '}
                    {t(`journeys.by.${journey.indicated_by}` as 'journeys.by.family')}
                  </Text>
                  {journey.professional_name ? (
                    <Text variant="caption" color={colors.textSecondary}>
                      {journey.professional_name}
                    </Text>
                  ) : null}

                  <JourneyProgress journey={journey} />

                  {journey.notes ? <Text variant="caption">{journey.notes}</Text> : null}

                  <Text variant="overline" color={colors.textSecondary}>
                    {t('journeys.started')}: {formatDate(journey.started_on, locale)}
                  </Text>
                </Card>
              ))}
            </View>
          )}
        </QueryState>
      ) : null}

      <Text variant="caption" color={colors.textSecondary}>
        {t('safety.consultProfessional')}
      </Text>
    </Screen>
  );
}
