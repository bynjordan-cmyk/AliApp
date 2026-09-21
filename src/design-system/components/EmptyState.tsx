import { StyleSheet, View } from 'react-native';

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
  root: {
    padding: spacing.xl,
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
