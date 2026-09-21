import type { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../tokens';
import { BrandLogo } from './BrandLogo';
import { Text } from './Text';

/**
 * Cabecera de pantalla: logotipo de marca y título.
 *
 * `icon` se mantiene por compatibilidad con las llamadas existentes, pero ya no
 * se dibuja: la marca es el logotipo oficial, no un icono del sistema.
 */
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <BrandLogo height={30} />
      </View>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text color={colors.textSecondary}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
});
