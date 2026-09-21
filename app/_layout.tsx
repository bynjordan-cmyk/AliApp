import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Instala crypto.getRandomValues, que usa newId() para generar UUID en cliente.
import 'expo-crypto';

import { ActiveBabyProvider } from '@/features/baby/ActiveBabyProvider';
import { SessionProvider } from '@/features/auth/SessionProvider';
import { I18nProvider } from '@/lib/i18n';
import { createQueryClient } from '@/lib/query-client';
import { colors } from '@/design-system';

export default function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <SessionProvider>
            <ActiveBabyProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.screen },
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen
                  name="quick-log"
                  options={{ presentation: 'modal', headerShown: false }}
                />
                <Stack.Screen
                  name="calendar"
                  options={{ presentation: 'modal', headerShown: false }}
                />
                <Stack.Screen
                  name="reaction-builder"
                  options={{ presentation: 'modal', headerShown: false }}
                />
              </Stack>
            </ActiveBabyProvider>
          </SessionProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
