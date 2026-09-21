import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  QueryState,
  PageHeader,
  Button,
  Chip,
  EmptyState,
  ListItem,
  Screen,
  SectionHeader,
  eventColors,
  spacing,
} from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { BabySelector } from '@/features/baby/BabySelector';
import { AllergenBoard } from '@/features/food/AllergenBoard';
import { useBreastfeeds, useFoodEntries } from '@/features/feeding/useFeeding';
import { formatDate, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

type FoodTab = 'baby' | 'caregiver' | 'breastfeeding' | 'board';

/** Pestaña Alimentación (§14): registros y panel de alimentos. */
export default function FoodScreen() {
  const { t, locale } = useI18n();
  const { baby } = useActiveBaby();
  const router = useRouter();
  const [tab, setTab] = useState<FoodTab>('baby');

  const foodEntries = useFoodEntries(baby?.id ?? null);
  const breastfeeds = useBreastfeeds(baby?.id ?? null);

  const visibleQuery =
    tab === 'breastfeeding' ? breastfeeds : foodEntries;

  if (!baby) {
    return (
      <Screen>
        <EmptyState title={t('today.noBaby')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={t('food.title')} icon="restaurant-outline" />
      <BabySelector />

      {/* Leer una etiqueta es parte de alimentar, así que vive aquí arriba. */}
      <Button
        variant="secondary"
        label={t('label.cta')}
        accessibilityHint={t('label.limits')}
        onPress={() => router.push('/label-scan')}
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Chip label={t('food.babyLog')} selected={tab === 'baby'} onPress={() => setTab('baby')} />
        <Chip
          label={t('food.caregiverLog')}
          selected={tab === 'caregiver'}
          onPress={() => setTab('caregiver')}
        />
        <Chip
          label={t('food.breastfeeding')}
          selected={tab === 'breastfeeding'}
          onPress={() => setTab('breastfeeding')}
        />
        <Chip
          label={t('food.allergenBoard')}
          selected={tab === 'board'}
          onPress={() => setTab('board')}
        />
      </View>

      <QueryState
        loading={visibleQuery.isLoading}
        error={visibleQuery.isError}
        onRetry={() => {
          void visibleQuery.refetch();
        }}
      >
        {tab === 'baby' || tab === 'caregiver' ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeader
              title={tab === 'baby' ? t('food.babyLog') : t('food.caregiverLog')}
              subtitle={t('safety.notDiagnostic')}
            />
            {(foodEntries.data ?? [])
              .filter((entry) =>
                tab === 'baby' ? entry.subject_type === 'baby' : entry.subject_type === 'caregiver',
              )
              .map((entry) => (
                <ListItem
                  key={entry.id}
                  title={t('timeline.foodEntry')}
                  subtitle={entry.notes ?? undefined}
                  meta={`${formatDate(entry.occurred_at, locale)} · ${formatTime(entry.occurred_at, locale)}`}
                  tint={eventColors.food}
                  onPress={() => router.push(`/record/food_entry/${entry.id}`)}
                />
              ))}
            {(foodEntries.data ?? []).filter((entry) =>
              tab === 'baby' ? entry.subject_type === 'baby' : entry.subject_type === 'caregiver',
            ).length === 0 ? (
              <EmptyState
                title={tab === 'baby' ? t('food.babyEmpty') : t('food.caregiverEmpty')}
                description={tab === 'baby' ? t('food.babyEmptyHint') : t('food.caregiverEmptyHint')}
              />
            ) : null}
          </View>
        ) : null}

        {tab === 'breastfeeding' ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeader title={t('food.breastfeeding')} />
            {(breastfeeds.data ?? []).map((row) => (
              <ListItem
                key={row.id}
                title={t(`feedKind.${row.feed_kind}` as 'feedKind.breast')}
                subtitle={row.side ? t(`breastfeed.${row.side}`) : undefined}
                meta={formatTime(row.started_at, locale)}
                tint={eventColors.breastfeed}
                onPress={() => router.push(`/record/breastfeed/${row.id}`)}
              />
            ))}
            {(breastfeeds.data ?? []).length === 0 ? (
              <EmptyState
                title={t('food.breastfeedingEmpty')}
                description={t('food.breastfeedingEmptyHint')}
              />
            ) : null}
          </View>
        ) : null}

        {tab === 'board' ? <AllergenBoard babyId={baby.id} /> : null}
      </QueryState>
    </Screen>
  );
}
