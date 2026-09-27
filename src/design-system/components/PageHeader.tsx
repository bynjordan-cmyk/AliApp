import type { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../tokens';
import { BrandLogo } from './BrandLogo';
import { Text } from './Text';

export function PageHeader({
  title,
  subtitle,
  prominent = false,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  prominent?: boolean;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <BrandLogo prominent={prominent} />
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
  brand: { alignItems: 'flex-start', marginBottom: spacing.md },
});
