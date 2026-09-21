import { useState } from 'react';
import { View } from 'react-native';

import {
  QueryState,
  PageHeader,
  Chip,
  EmptyState,
  ListItem,
  Screen,
  SectionHeader,
  Text,
  colors,
  eventColors,
  spacing,
} from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { BabySelector } from '@/features/baby/BabySelector';
import { useSymptoms } from '@/features/symptoms/useSymptoms';
import { symptomTypeKey } from '@/features/timeline/timeline-labels';
import { formatDate, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

type HealthTab = 'symptoms' | 'episodes' | 'diapers' | 'medications' | 'attachments';

/**
 * Pestaña Salud (§14).
 *
 * Síntomas y episodios de reacción son objetos distintos y se listan por
 * separado: un síntoma existe por sí mismo y solo se agrupa cuando una persona
 * decide agruparlo (§27).
 */
export default function HealthScreen() {
  const { t, locale } = useI18n();
  const { baby } = useActiveBaby();
  const [tab, setTab] = useState<HealthTab>('symptoms');

  const symptoms = useSymptoms(baby?.id ?? null);

  // La base guarda una clave estable; el texto visible se resuelve aquí (§20).
  const translateSymptom = (value: string) => {
    const key = symptomTypeKey(value);
    return key ? t(key) : value;
  };

  if (!baby) {
    return (
      <Screen>
        <EmptyState title={t('today.noBaby')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={t('health.title')} icon="heart-outline" />
      <BabySelector />

      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Chip
          label={t('health.symptoms')}
          selected={tab === 'symptoms'}
          onPress={() => setTab('symptoms')}
        />
        <Chip
          label={t('health.episodes')}
          selected={tab === 'episodes'}
          onPress={() => setTab('episodes')}
        />
        <Chip
          label={t('health.diapers')}
          selected={tab === 'diapers'}
          onPress={() => setTab('diapers')}
        />
        <Chip
          label={t('health.medications')}
          selected={tab === 'medications'}
          onPress={() => setTab('medications')}
        />
        <Chip
          label={t('health.attachments')}
          selected={tab === 'attachments'}
          onPress={() => setTab('attachments')}
        />
      </View>

      <QueryState
        loading={tab === 'symptoms' && symptoms.isLoading}
        error={tab === 'symptoms' && symptoms.isError}
        onRetry={() => {
          void symptoms.refetch();
        }}
      >
        {tab === 'symptoms' ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeader title={t('health.symptoms')} subtitle={t('safety.notDiagnostic')} />
            {(symptoms.data ?? []).map((symptom) => (
              <ListItem
                key={symptom.id}
                title={translateSymptom(symptom.symptom_type)}
                subtitle={
                  symptom.severity
                    ? t(`health.severity${symptom.severity}` as 'health.severity1')
                    : undefined
                }
                meta={`${formatDate(symptom.started_at, locale)} · ${formatTime(symptom.started_at, locale)}`}
                tint={eventColors.symptom}
              />
            ))}
            {(symptoms.data ?? []).length === 0 ? <EmptyState title={t('common.empty')} /> : null}
          </View>
        ) : null}

        {tab !== 'symptoms' ? (
          <EmptyState title={t('common.empty')} description={t('safety.consultProfessional')} />
        ) : null}
      </QueryState>
      <Text variant="caption" color={colors.textSecondary}>
        {t('safety.notDiagnostic')}
      </Text>
    </Screen>
  );
}
