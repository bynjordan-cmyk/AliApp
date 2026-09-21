import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, TextInput, View } from 'react-native';
import { z } from 'zod';

import { Button, Card, Screen, Text, colors, radius, spacing, touchTarget } from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { createBaby, createHousehold } from '@/features/baby/baby.service';
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

      await createBaby(
        {
          householdId: household.id,
          name: values.babyName,
          birthDate: values.birthDate ? values.birthDate : undefined,
          feedingMode: [],
        },
        profileId,
      );

      await queryClient.invalidateQueries({ queryKey: queryKeys.households });
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
    }
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display">{t('onboarding.title')}</Text>
        <Text color={colors.textSecondary}>{t('safety.notDiagnostic')}</Text>
      </View>

      <Card>
        <Text variant="caption" color={colors.textSecondary}>
          {t('onboarding.householdName')}
        </Text>
        <Controller
          control={control}
          name="householdName"
          render={({ field }) => (
            <TextInput
              style={styles.input}
              accessibilityLabel={t('onboarding.householdName')}
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <Text variant="caption" color={colors.textSecondary}>
          {t('onboarding.babyName')}
        </Text>
        <Controller
          control={control}
          name="babyName"
          render={({ field }) => (
            <TextInput
              style={styles.input}
              accessibilityLabel={t('onboarding.babyName')}
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
          render={({ field }) => (
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              accessibilityLabel={t('onboarding.babyBirthDate')}
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        {error ? (
          <Text variant="caption" color={colors.accent}>
            {error}
          </Text>
        ) : null}

        <Button
          label={t('onboarding.create')}
          onPress={onSubmit}
          disabled={formState.isSubmitting}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginTop: spacing.xl },
  input: {
    minHeight: touchTarget.comfortable,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
});
