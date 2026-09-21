import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, EmptyState, PageHeader, Screen, Text, colors } from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { BabySelector } from '@/features/baby/BabySelector';
import { EvolutionCalendar } from '@/features/calendar/EvolutionCalendar';
import { useT } from '@/lib/i18n';

/**
 * Calendario global, accesible desde Inicio.
 *
 * Agrega todo lo registrado —alimentación, lactancia, síntomas, episodios,
 * pañales, medicación, fotos y recordatorios— con filtros por tipo. El
 * calendario de Procesos sigue existiendo como vista del proceso.
 */
export default function CalendarScreen() {
  const t = useT();
  const router = useRouter();
  const { baby } = useActiveBaby();

  if (!baby) {
    return (
      <Screen>
        <PageHeader title={t('calendar.title')} />
        <EmptyState title={t('today.noBaby')} description={t('today.noBabyHint')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={t('calendar.title')} />
      <BabySelector />

      <View>
        <EvolutionCalendar babyId={baby.id} />
      </View>

      <Text variant="caption" color={colors.textSecondary}>
        {t('calendar.legend')}
      </Text>

      <Button variant="ghost" label={t('common.close')} onPress={() => router.back()} />
    </Screen>
  );
}
