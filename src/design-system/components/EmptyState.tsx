import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../tokens';
import { Text } from './Text';

export type EmptyStateProps = {
  title: string;
  description?: string;
  testID?: string;
};

export function EmptyState({ title, description, testID }: EmptyStateProps) {
  return (
    <View testID={testID} style={styles.root}>
      <View
        style={styles.icon}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name="journal-outline" size={28} color={colors.brand} />
      </View>
      <Text variant="bodyStrong" center>
        {title}
      </Text>
      {description ? (
        <Text variant="caption" color={colors.textSecondary} center>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.calmSoft,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  root: {
    padding: spacing.xxl,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
