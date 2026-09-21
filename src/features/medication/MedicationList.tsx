import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { EmptyState, ListItem, QueryState, eventColors, spacing } from '@/design-system';
import { formatDate, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

import { listMedicationEvents } from './medication.service';

/** Medicación registrada. Registro factual: AliApp nunca sugiere dosis (§10). */
export function MedicationList({ babyId }: { babyId: string }) {
  const { t, locale } = useI18n();

  const medications = useQuery({
    queryKey: queryKeys.medications(babyId),
    queryFn: () => listMedicationEvents(babyId),
  });

  return (
    <QueryState
      loading={medications.isLoading}
      error={medications.isError}
      onRetry={() => {
        void medications.refetch();
      }}
    >
      {(medications.data ?? []).length === 0 ? (
        <EmptyState title={t('health.noMedications')} description={t('health.noMedicationsHint')} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {(medications.data ?? []).map((medication) => (
            <ListItem
              key={medication.id}
              title={medication.name}
              subtitle={medication.dose_text ?? undefined}
              meta={`${formatDate(medication.occurred_at, locale)} · ${formatTime(medication.occurred_at, locale)}`}
              tint={eventColors.medication}
            />
          ))}
        </View>
      )}
    </QueryState>
  );
}
