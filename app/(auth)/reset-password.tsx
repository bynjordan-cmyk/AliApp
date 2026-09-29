import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  Input,
  LoadingState,
  PageHeader,
  Screen,
  Text,
  colors,
} from '@/design-system';
import { changePassword } from '@/features/auth/recovery.service';
import { useSession } from '@/features/auth/SessionProvider';
import { useT } from '@/lib/i18n';

export default function ResetPassword() {
  const t = useT();
  const router = useRouter();
  const { session, loading } = useSession();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (busy) return;
    if (password.length < 8 || password !== repeat) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await changePassword(password);
      setPassword('');
      setRepeat('');
      setDone(true);
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen maxWidth={520}>
      <PageHeader title={t('auth.newPassword')} />
      {loading ? (
        <LoadingState label={t('common.loading')} />
      ) : !session ? (
        <>
          <Text>{t('auth.recoveryExpired')}</Text>
          <Button label={t('auth.sendRecovery')} onPress={() => router.replace('/recover')} />
        </>
      ) : done ? (
        <>
          <Text accessibilityRole="alert">{t('auth.passwordChanged')}</Text>
          <Button label={t('common.today')} onPress={() => router.replace('/')} />
        </>
      ) : (
        <Card>
          <Input
            label={t('auth.newPassword')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <Input
            label={t('auth.repeatPassword')}
            value={repeat}
            onChangeText={setRepeat}
            secureTextEntry
            autoComplete="new-password"
            onSubmitEditing={() => void save()}
          />
          {error ? (
            <Text color={colors.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button label={t('common.save')} loading={busy} onPress={() => void save()} />
        </Card>
      )}
    </Screen>
  );
}
