import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Switch, View } from 'react-native';
import { z } from 'zod';

import { Input, PageHeader, Button, Card, Screen, Text, colors, spacing } from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { createBaby, createHousehold, updateBaby } from '@/features/baby/baby.service';
import { suggestStageFromAge } from '@/features/baby/feeding-stage';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';

const onboardingSchema = z.object({
  householdName: z.string().trim().min(1).max(120),
  babyName: z.string().trim().min(1).max(80),
  // Se guarda la fecha; la edad se deriva de ella y nunca se almacena (§5).
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD')
    .optional()
    .or(z.literal('')),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function OnboardingScreen() {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, refreshProfile } = useSession();
  const [error, setError] = useState<string | null>(null);
  // Pregunta explícita: manda sobre cualquier estimación por edad.
  const [solidsStarted, setSolidsStarted] = useState(false);
  const [breastfeeding, setBreastfeeding] = useState(true);

  const { control, handleSubmit, formState } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { householdName: '', babyName: '', birthDate: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      let profileId = profile?.id;
      if (!profileId) {
        await refreshProfile();
        profileId = profile?.id;
      }
      if (!profileId) throw new Error('No se encontró el perfil');

      const household = await createHousehold({ name: values.householdName, locale: 'es' });

      const bebe = await createBaby(
        {
          householdId: household.id,
          name: values.babyName,
          birthDate: values.birthDate ? values.birthDate : undefined,
          feedingMode: [],
        },
        profileId,
      );

      await updateBaby(bebe.id, {
        solidsStarted,
        breastfeeding,
        // La etapa se propone desde la edad y la respuesta sobre sólidos; la
        // familia puede cambiarla luego en Perfil.
        feedingStage: solidsStarted
          ? 'complementary_feeding'
          : (suggestStageFromAge(values.birthDate || null) ?? 'milk_only'),
      });

      await queryClient.invalidateQueries({ queryKey: queryKeys.households });
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
    }
  });

  return (
    <Screen>
      <View style={styles.header}>
        <PageHeader title={t('onboarding.title')} icon="people-outline" />
        <Text color={colors.textSecondary}>{t('safety.notDiagnostic')}</Text>
      </View>

      <Card>
        <Controller
          control={control}
          name="householdName"
          render={({ field, fieldState }) => (
            <Input
              error={fieldState.error ? t('common.invalidField') : undefined}
              onBlur={field.onBlur}
              label={t('onboarding.householdName')}
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="babyName"
          render={({ field, fieldState }) => (
            <Input
              error={fieldState.error ? t('common.invalidField') : undefined}
              onBlur={field.onBlur}
              label={t('onboarding.babyName')}
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <Text variant="caption" color={colors.textSecondary}>
          {t('onboarding.babyBirthDate')} · {t('common.optional')}
        </Text>
        <Controller
          control={control}
          name="birthDate"
          render={({ field, fieldState }) => (
            <Input
              error={fieldState.error ? t('common.invalidField') : undefined}
              onBlur={field.onBlur}
              placeholder="AAAA-MM-DD"
              label={t('onboarding.babyBirthDate')}
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <View style={styles.pregunta}>
          <View style={{ flex: 1 }}>
            <Text>{t('profile.solidsStarted')}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t('profile.solidsHint')}
            </Text>
          </View>
          <Switch
            value={solidsStarted}
            accessibilityLabel={t('profile.solidsStarted')}
            trackColor={{ true: colors.accent, false: colors.border }}
            onValueChange={setSolidsStarted}
          />
        </View>

        <View style={styles.pregunta}>
          <Text style={{ flex: 1 }}>{t('quickLog.breastfeed')}</Text>
          <Switch
            value={breastfeeding}
            accessibilityLabel={t('quickLog.breastfeed')}
            trackColor={{ true: colors.accent, false: colors.border }}
            onValueChange={setBreastfeeding}
          />
        </View>

        {error ? (
          <Text variant="caption" color={colors.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Button
          label={t('onboarding.create')}
          onPress={onSubmit}
          loading={formState.isSubmitting}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginTop: spacing.xl },
  pregunta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
  },
});
