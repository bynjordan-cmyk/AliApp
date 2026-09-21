import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Text, colors, elevation, radius, spacing, touchTarget } from '@/design-system';
import { useT } from '@/lib/i18n';

/**
 * Botón "+" principal.
 *
 * Es el punto de entrada de todo el registro frecuente: grande, abajo a la
 * derecha y alcanzable con el pulgar (§15, uso con una mano).
 */
export function QuickLogFab() {
  const router = useRouter();
  const t = useT();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('today.quickLog')}
      accessibilityHint={t('quickLog.title')}
      onPress={() => router.push('/quick-log')}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <Text variant="title" color={colors.textOnAccent}>
        +
      </Text>
      <Text variant="caption" color={colors.textOnAccent}>
        {t('today.quickLog')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xxl,
    minHeight: touchTarget.comfortable + spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    ...elevation.card,
  },
  pressed: { opacity: 0.9 },
});
