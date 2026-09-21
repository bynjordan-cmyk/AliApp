import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, surfaces, type SurfaceTone } from '../tokens';
import { Text } from './Text';

export type StatTileProps = {
  value: number;
  label: string;
  tone: SurfaceTone;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

/**
 * Métrica del resumen diario: número grande, icono y etiqueta.
 *
 * El color es apoyo, nunca el dato: cada casilla lleva icono y texto, de modo
 * que se entiende igual sin distinguir colores (§21).
 */
export function StatTile({ value, label, tone, icon }: StatTileProps) {
  const surface = surfaces[tone];

  return (
    <View
      style={[styles.tile, { backgroundColor: surface.background }]}
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <Ionicons name={icon} size={20} color={surface.ink} accessible={false} />
      <Text variant="display" color={surface.ink}>
        {value}
      </Text>
      <Text variant="caption" color={surface.ink}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 130,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xxs,
  },
});
