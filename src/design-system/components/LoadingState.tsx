import { ActivityIndicator, View } from 'react-native';
import { colors, spacing } from '../tokens';
import { Text } from './Text';

export function LoadingState({ label }: { label: string }) {
  return (
    <View
      accessibilityState={{ busy: true }}
      style={{ padding: spacing.xl, gap: spacing.md, alignItems: 'center' }}
    >
      <ActivityIndicator color={colors.brand} />
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
    </View>
  );
}
