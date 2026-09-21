import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, elevation, radius, spacing, surfaces, type SurfaceTone } from '../tokens';
import { Text } from './Text';

export type HeroCardProps = {
  /** Rótulo corto de contexto: "Lo importante hoy". */
  eyebrow: string;
  title: string;
  description?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  tone?: SurfaceTone;
  children?: ReactNode;
};

/**
 * Tarjeta protagonista de Hoy.
 *
 * Muestra UN hecho relevante del día. Nunca una conclusión clínica: describe
 * lo que hay registrado (un proceso activo, una revisión próxima, la ausencia
 * de síntomas nuevos) y deja la interpretación a la familia.
 */
export function HeroCard({
  eyebrow,
  title,
  description,
  icon = 'sparkles-outline',
  tone = 'journey',
  children,
}: HeroCardProps) {
  const surface = surfaces[tone];

  return (
    <View style={[styles.card, { backgroundColor: surface.background }]}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: colors.surface }]}>
          <Ionicons name={icon} size={18} color={surface.ink} accessible={false} />
        </View>
        <Text variant="overline" color={colors.textSecondary}>
          {eyebrow.toUpperCase()}
        </Text>
      </View>

      <Text variant="title" color={surface.ink} accessibilityRole="header">
        {title}
      </Text>

      {description ? (
        <Text color={colors.textSecondary}>{description}</Text>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    ...elevation.hero,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
