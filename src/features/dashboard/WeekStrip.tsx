import { addDays, format, startOfWeek } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, colors, radius, spacing, surfaces, touchTarget } from '@/design-system';
import { localDayKey } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { TimelineItem } from '@/types/timeline';

const LOCALES = { es, en: enUS } as const;

/**
 * Semana compacta del dashboard.
 *
 * Siete días con el número de registros de cada uno. Tocar un día cambia todo
 * el dashboard a esa fecha. El día con registros se distingue por el número y
 * por el punto, no solo por el color (§21).
 */
export function WeekStrip({
  items,
  selectedDayKey,
  onSelectDay,
}: {
  items: TimelineItem[];
  selectedDayKey: string;
  onSelectDay: (dayKey: string, date: Date) => void;
}) {
  const { locale } = useI18n();
  const hoy = new Date();
  const inicioSemana = startOfWeek(hoy, { weekStartsOn: 1 });

  const porDia = new Map<string, number>();
  for (const item of items) {
    const clave = localDayKey(item.occurredAt);
    porDia.set(clave, (porDia.get(clave) ?? 0) + 1);
  }

  return (
    <View style={styles.root}>
      {Array.from({ length: 7 }, (_, indice) => {
        const fecha = addDays(inicioSemana, indice);
        const clave = localDayKey(fecha);
        const cuenta = porDia.get(clave) ?? 0;
        const elegido = clave === selectedDayKey;
        const futuro = fecha.getTime() > hoy.getTime() && clave !== localDayKey(hoy);

        return (
          <Pressable
            key={clave}
            accessibilityRole="button"
            accessibilityState={{ selected: elegido, disabled: futuro }}
            accessibilityLabel={`${format(fecha, 'EEEE d', { locale: LOCALES[locale] })}, ${cuenta}`}
            disabled={futuro}
            onPress={() => onSelectDay(clave, fecha)}
            style={[styles.dia, elegido && styles.elegido, futuro && styles.futuro]}
          >
            <Text variant="overline" color={elegido ? colors.textOnAccent : colors.textSecondary}>
              {format(fecha, 'EEEEE', { locale: LOCALES[locale] }).toUpperCase()}
            </Text>
            <Text variant="bodyStrong" color={elegido ? colors.textOnAccent : colors.textPrimary}>
              {fecha.getDate()}
            </Text>
            {cuenta > 0 ? (
              <View
                style={[
                  styles.punto,
                  { backgroundColor: elegido ? colors.textOnAccent : surfaces.feeding.accent },
                ]}
              />
            ) : (
              <View style={styles.puntoVacio} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'space-between' },
  dia: {
    flex: 1,
    minHeight: touchTarget.comfortable + spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  elegido: { backgroundColor: colors.brand },
  futuro: { opacity: 0.35 },
  punto: { width: 6, height: 6, borderRadius: radius.pill },
  puntoVacio: { width: 6, height: 6 },
});
