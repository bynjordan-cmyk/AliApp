import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Input,
  PageHeader,
  QueryState,
  Screen,
  Text,
  colors,
  spacing,
} from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { useSession } from '@/features/auth/SessionProvider';
import { can } from '@/features/caregivers/permissions';
import { useFoods } from '@/features/food/useFoods';
import { createJourney } from '@/features/journeys/journey.service';
import {
  createJourneySchema,
  type CreateJourneyInput,
  type JourneyTargetInput,
} from '@/lib/validation';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

export default function NewJourney() {
  const t = useT();
  const router = useRouter();
  const cache = useQueryClient();
  const { baby, household, membership } = useActiveBaby();
  const { profile } = useSession();
  const foods = useFoods();
  const [type, setType] = useState<CreateJourneyInput['journeyType']>('tracking');
  const [by, setBy] = useState<CreateJourneyInput['indicatedBy']>('family');
  const [start, setStart] = useState('');
  const [review, setReview] = useState('');
  const [professional, setProfessional] = useState('');
  const [notes, setNotes] = useState('');
  const [targets, setTargets] = useState<JourneyTargetInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (input: CreateJourneyInput) => createJourney(input, profile!.id),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: queryKeys.journeys(baby!.id) });
      router.back();
    },
  });
  const allowed = Boolean(baby && household && profile && can('journey.write', membership));
  const submit = () => {
    const result = createJourneySchema.safeParse({
      householdId: household?.id,
      babyId: baby?.id,
      journeyType: type,
      status: 'active',
      startedOn: start,
      reviewOn: review || undefined,
      indicatedBy: by,
      professionalName: professional || undefined,
      notes: notes || undefined,
      targets,
    });
    if (!result.success) {
      setError(t('journeyForm.invalid'));
      return;
    }
    setError(null);
    save.mutate(result.data);
  };
  return (
    <Screen maxWidth={600}>
      <PageHeader title={t('journeyForm.title')} subtitle={t('journeyForm.hint')} />
      {!allowed ? (
        <Text>{t('journeyForm.noPermission')}</Text>
      ) : (
        <>
          <Card>
            <Text variant="subtitle">{t('journeyForm.type')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {(
                [
                  'tracking',
                  'introduction',
                  'observation',
                  'exclusion',
                  'reintroduction',
                  'known_allergy',
                ] as const
              ).map((value) => (
                <Chip
                  key={value}
                  label={t(`journeys.type.${value}`)}
                  selected={type === value}
                  onPress={() => setType(value)}
                />
              ))}
            </View>
            <Input label={t('journeyForm.start')} value={start} onChangeText={setStart} />
            <Input label={t('journeyForm.review')} value={review} onChangeText={setReview} />
            <Text variant="subtitle">{t('journeys.indicatedBy')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {(['family', 'pediatrician', 'allergist', 'dietitian', 'other'] as const).map(
                (value) => (
                  <Chip
                    key={value}
                    label={t(`journeys.by.${value}`)}
                    selected={by === value}
                    onPress={() => setBy(value)}
                  />
                ),
              )}
            </View>
            {by !== 'family' ? (
              <Input
                label={t('journeyForm.professional')}
                value={professional}
                onChangeText={setProfessional}
              />
            ) : null}
            <Input label={t('common.notes')} multiline value={notes} onChangeText={setNotes} />
          </Card>
          <Card>
            <Text variant="subtitle">{t('journeyForm.targets')}</Text>
            <Text variant="caption">{t('journeyForm.targetsHint')}</Text>
            <QueryState
              loading={foods.isLoading}
              error={foods.isError}
              onRetry={() => {
                void foods.refetch();
              }}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {(foods.data ?? []).map((food) => (
                  <Chip
                    key={food.id}
                    label={food.displayName}
                    selected={targets.some((x) => x.foodId === food.id)}
                    onPress={() =>
                      setTargets((current) =>
                        current.some((x) => x.foodId === food.id)
                          ? current.filter((x) => x.foodId !== food.id)
                          : [
                              ...current,
                              { foodId: food.id, targetSubject: 'baby', action: 'observe' },
                            ],
                      )
                    }
                  />
                ))}
              </View>
            </QueryState>
            {targets.map((target) => (
              <View key={target.foodId} style={{ gap: spacing.sm }}>
                <Text variant="bodyStrong">
                  {foods.data?.find((f) => f.id === target.foodId)?.displayName}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {(['baby', 'caregiver'] as const).map((value) => (
                    <Chip
                      key={value}
                      label={t(`journeyForm.subject.${value}`)}
                      selected={target.targetSubject === value}
                      onPress={() =>
                        setTargets((xs) =>
                          xs.map((x) =>
                            x.foodId === target.foodId ? { ...x, targetSubject: value } : x,
                          ),
                        )
                      }
                    />
                  ))}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {(['avoid', 'introduce', 'maintain', 'observe'] as const).map((value) => (
                    <Chip
                      key={value}
                      label={t(`journeyForm.action.${value}`)}
                      selected={target.action === value}
                      onPress={() =>
                        setTargets((xs) =>
                          xs.map((x) => (x.foodId === target.foodId ? { ...x, action: value } : x)),
                        )
                      }
                    />
                  ))}
                </View>
              </View>
            ))}
          </Card>
          {error || save.isError ? (
            <Text color={colors.error} accessibilityRole="alert">
              {error ?? t('common.error')}
            </Text>
          ) : null}
          <Button label={t('common.save')} loading={save.isPending} onPress={submit} />
        </>
      )}
      <Button
        label={t('common.cancel')}
        variant="ghost"
        disabled={save.isPending}
        onPress={() => router.back()}
      />
    </Screen>
  );
}
