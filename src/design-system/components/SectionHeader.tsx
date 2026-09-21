import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '../tokens';
import { Text } from './Text';

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.root} accessibilityRole="header">
      <Text variant="subtitle">{title}</Text>
      {subtitle ? (
        <Text variant="caption" color={colors.textSecondary}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xxs, marginTop: spacing.sm },
});
