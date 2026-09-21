import { useState } from 'react';
import { View } from 'react-native';

import {
  QueryState,
  PageHeader,
  Card,
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
import { useAllergenBoard } from '@/features/food/useFoods';
import { useFoodNames } from '@/features/food/useFoodNames';
import { useBreastfeeds, useFoodEntries } from '@/features/feeding/useFeeding';
import { formatDate, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { FoodStatus } from '@/types/domain';

type FoodTab = 'baby' | 'caregiver' | 'breastfeeding' | 'board';

/** Pestaña Alimentación (§14): registros y panel de alimentos. */
export default function FoodScreen() {
  const { t, locale } = useI18n();
  const { baby } = useActiveBaby();
  const [tab, setTab] = useState<FoodTab>('baby');

  const foodEntries = useFoodEntries(baby?.id ?? null);
  const breastfeeds = useBreastfeeds(baby?.id ?? null);
  const board = useAllergenBoard(baby?.id ?? null);
  const foodNames = useFoodNames();

  const visibleQuery =
    tab === 'board' ? board : tab === 'breastfeeding' ? breastfeeds : foodEntries;

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
                />
              ))}
            {(foodEntries.data ?? []).filter((entry) =>
              tab === 'baby' ? entry.subject_type === 'baby' : entry.subject_type === 'caregiver',
            ).length === 0 ? (
              <EmptyState title={t('common.empty')} />
            ) : null}
          </View>
        ) : null}

        {tab === 'breastfeeding' ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeader title={t('food.breastfeeding')} />
            {(breastfeeds.data ?? []).map((row) => (
              <ListItem
                key={row.id}
                title={t('timeline.breastfeed')}
                subtitle={row.side ? t(`breastfeed.${row.side}`) : undefined}
                meta={formatTime(row.started_at, locale)}
                tint={eventColors.breastfeed}
              />
            ))}
            {(breastfeeds.data ?? []).length === 0 ? (
              <EmptyState title={t('common.empty')} />
            ) : null}
          </View>
        ) : null}

        {tab === 'board' ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title={t('food.allergenBoard')} subtitle={t('safety.limitedData')} />
            {board.groups
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <Card key={group.status}>
                  <Text variant="subtitle">{t(`foodStatus.${group.status}` as const)}</Text>
                  {group.items.map((item) => (
                    <ListItem
                      key={`${group.status}-${item.food_id}`}
                      title={
                        foodNames.byId.get(item.food_id ?? '') ??
                        item.canonical_name ??
                        item.canonical_key ??
                        ''
                      }
                      subtitle={`${t('foodStatus.exposures')}: ${item.exposure_count ?? 0}`}
                      meta={
                        item.last_exposure_at
                          ? formatDate(item.last_exposure_at, locale)
                          : undefined
                      }
                      tint={statusTint(group.status)}
                    />
                  ))}
                </Card>
              ))}
            <Text variant="caption" color={colors.textSecondary}>
              {t('safety.consultProfessional')}
            </Text>
          </View>
        ) : null}
      </QueryState>
    </Screen>
  );
}

/** Color por estado. Siempre acompañado del nombre del estado en texto (§21). */
function statusTint(status: FoodStatus): string {
  switch (status) {
    case 'tolerated':
      return eventColors.diaper;
    case 'avoid':
    case 'professional_supervision':
      return eventColors.food;
    case 'observing':
    case 'introducing':
      return eventColors.symptom;
    default:
      return colors.border;
  }
}
