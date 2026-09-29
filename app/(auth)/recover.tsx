import { useState } from 'react';
import { useRouter } from 'expo-router';
import { z } from 'zod';
import { Button, Card, Input, PageHeader, Screen, Text, colors } from '@/design-system';
import { requestPasswordRecovery } from '@/features/auth/recovery.service';
import { useT } from '@/lib/i18n';

export default function RecoverAccess() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    if (busy) return;
    if (!z.email().safeParse(email.trim()).success) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestPasswordRecovery(email);
      setSent(true);
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen maxWidth={520}>
      <PageHeader title={t('auth.recoveryTitle')} subtitle={t('auth.recoveryHint')} />
      <Card>
        {sent ? (
          <Text accessibilityRole="alert">{t('auth.recoverySent')}</Text>
        ) : (
          <>
            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onSubmitEditing={() => void send()}
            />
            <Button label={t('auth.sendRecovery')} loading={busy} onPress={() => void send()} />
          </>
        )}
        {error ? (
          <Text color={colors.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </Card>
      <Button variant="ghost" label={t('auth.signIn')} onPress={() => router.replace('/sign-in')} />
    </Screen>
  );
}
