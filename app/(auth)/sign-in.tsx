import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, TextInput, View } from 'react-native';
import { z } from 'zod';

import { Button, Card, Screen, Text, colors, radius, spacing, touchTarget } from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { useT } from '@/lib/i18n';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  displayName: z.string().trim().max(80).optional(),
});

type Credentials = z.infer<typeof credentialsSchema>;

export default function SignInScreen() {
  const t = useT();
  const router = useRouter();
  const { signIn, signUp } = useSession();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      if (mode === 'sign-in') {
        await signIn(values.email, values.password);
      } else {
        await signUp(values.email, values.password, values.displayName ?? '');
      }
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('common.error'));
    }
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display">{t('auth.signInTitle')}</Text>
        <Text color={colors.textSecondary}>{t('auth.signInSubtitle')}</Text>
      </View>

      <Card>
        {mode === 'sign-up' ? (
          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <TextInput
                style={styles.input}
                placeholder={t('onboarding.householdName')}
                accessibilityLabel={t('onboarding.householdName')}
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextInput
              style={styles.input}
              placeholder={t('auth.email')}
              accessibilityLabel={t('auth.email')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextInput
              style={styles.input}
              placeholder={t('auth.password')}
              accessibilityLabel={t('auth.password')}
              secureTextEntry
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
          label={mode === 'sign-in' ? t('auth.signIn') : t('auth.signUp')}
          onPress={onSubmit}
          disabled={formState.isSubmitting}
        />
        <Button
          variant="ghost"
          label={mode === 'sign-in' ? t('auth.toggleToSignUp') : t('auth.toggleToSignIn')}
          onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        />
      </Card>

      <Text variant="caption" color={colors.textSecondary}>
        {t('safety.notDiagnostic')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginTop: spacing.xxl },
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
