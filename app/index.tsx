import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { Screen, Text } from '@/design-system';
import { useT } from '@/lib/i18n';

/** Punto de entrada: decide entre autenticación, onboarding y la app. */
export default function Index() {
  const { session, loading, configured } = useSession();
  const { households, loading: loadingHousehold } = useActiveBaby();
  const t = useT();

  if (!configured) {
    return (
      <Screen>
        <Text variant="title">{t('common.error')}</Text>
        <Text>
          Falta la configuración de Supabase. Copia `.env.example` a `.env.local` y define
          EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY.
        </Text>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <Text>{t('common.loading')}</Text>
      </Screen>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!loadingHousehold && households.length === 0) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
