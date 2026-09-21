import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  CONTENT_MAX_WIDTH,
  Text,
  colors,
  elevation,
  radius,
  spacing,
  touchTarget,
  useLayout,
} from '@/design-system';
import { useT } from '@/lib/i18n';

/**
 * Botón "+" principal.
 *
 * Es el punto de entrada de todo el registro frecuente: grande y alcanzable con
 * el pulgar (§15, uso con una mano). En pantallas anchas se queda junto a la
 * columna de contenido en lugar de irse al borde derecho de la ventana.
 */
export function QuickLogFab({ maxWidth = CONTENT_MAX_WIDTH }: { maxWidth?: number }) {
  const router = useRouter();
  const t = useT();
  const { isWide } = useLayout();

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View pointerEvents="box-none" style={[styles.column, { maxWidth }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('today.quickLog')}
          accessibilityHint={t('quickLog.title')}
          onPress={() => router.push('/quick-log')}
          style={({ pressed }) => [
            styles.fab,
            isWide && styles.fabWide,
            pressed && styles.pressed,
          ]}
        >
          <Text variant="title" color={colors.textOnAccent}>
            +
          </Text>
          <Text variant="caption" color={colors.textOnAccent}>
            {t('today.quickLog')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  fab: {
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
  fabWide: { flexDirection: 'row', gap: spacing.sm },
  pressed: { opacity: 0.9 },
});
