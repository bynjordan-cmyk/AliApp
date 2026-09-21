import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '../tokens';
import { Text } from './Text';

export function PageHeader({
  title,
  subtitle,
  icon = 'heart-outline',
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={styles.root}>
      <View
        style={styles.brand}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.mark}>
          <Ionicons name={icon} size={22} color={colors.brand} />
        </View>
        <Text variant="bodyStrong" color={colors.brand}>
          AliApp<Text color={colors.accent}>.</Text>
        </Text>
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
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
