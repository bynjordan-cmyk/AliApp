import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
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
import { EpisodeList } from '@/features/reactions/EpisodeList';
import { DiaperList } from '@/features/diapers/DiaperList';
import { MedicationList } from '@/features/medication/MedicationList';
import { SymptomCard } from '@/features/symptoms/SymptomCard';
import { useSymptoms } from '@/features/symptoms/useSymptoms';
import { useT } from '@/lib/i18n';

type HealthTab = 'symptoms' | 'episodes' | 'diapers' | 'medications';

/**
 * Pantalla Salud (§14).
 *
 * Síntomas y episodios son objetos distintos y se listan por separado: un
 * síntoma existe por sí mismo y solo se agrupa cuando una persona lo decide.
 *
 * Aviso de seguridad: UNO solo, al pie. Repetirlo en cada sección lo convierte
 * en ruido que nadie lee.
 */
export default function HealthScreen() {
  const t = useT();
  const router = useRouter();
  const { baby } = useActiveBaby();
  const [tab, setTab] = useState<HealthTab>('symptoms');

  const symptoms = useSymptoms(baby?.id ?? null);

  if (!baby) {
    return (
      <Screen>
        <PageHeader title={t('health.title')} />
        <EmptyState title={t('today.noBaby')} description={t('today.noBabyHint')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={t('health.title')} />
      <BabySelector />

      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {(
          [
            ['symptoms', t('health.symptoms')],
            ['episodes', t('health.episodes')],
            ['diapers', t('health.diapers')],
            ['medications', t('health.medications')],
          ] as const
        ).map(([value, label]) => (
          <Chip key={value} label={label} selected={tab === value} onPress={() => setTab(value)} />
        ))}
      </View>

      {tab === 'symptoms' ? (
        <QueryState
          loading={symptoms.isLoading}
          error={symptoms.isError}
          onRetry={() => {
            void symptoms.refetch();
          }}
        >
          {(symptoms.data ?? []).length === 0 ? (
            <EmptyState title={t('health.noSymptoms')} description={t('health.noSymptomsHint')} />
          ) : (
            <View style={{ gap: spacing.md }}>
              {(symptoms.data ?? []).map((symptom) => (
                <SymptomCard
                  key={symptom.id}
                  symptom={symptom}
                  onGroup={(symptomId) =>
                    router.push({ pathname: '/reaction-builder', params: { symptomId } })
                  }
                />
              ))}
            </View>
          )}
        </QueryState>
      ) : null}

      {tab === 'episodes' ? <EpisodeList babyId={baby.id} /> : null}
      {tab === 'diapers' ? <DiaperList babyId={baby.id} /> : null}
      {tab === 'medications' ? <MedicationList babyId={baby.id} /> : null}

      <Text variant="caption" color={colors.textSecondary}>
        {t('safety.notDiagnostic')}
      </Text>
    </Screen>
  );
}
