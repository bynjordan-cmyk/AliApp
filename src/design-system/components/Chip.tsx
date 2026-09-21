import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tint?: string;
  /** Short text shown next to the colour so state is never colour-only (§21). */
  stateLabel?: string;
  testID?: string;
};

export function Chip({ label, selected = false, onPress, tint, stateLabel, testID }: ChipProps) {
  const content = (
    <View
      style={[
        styles.chip,
        selected && styles.selected,
        tint && !selected ? { borderColor: tint } : null,
      ]}
    >
      {tint ? <View style={[styles.dot, { backgroundColor: tint }]} /> : null}
      {selected ? (
        <Ionicons name="checkmark" size={16} color={colors.brand} accessible={false} />
      ) : null}
      <Text variant="caption" style={{ flexShrink: 1 }} color={colors.textPrimary}>
        {label}
      </Text>
      {stateLabel ? (
        <Text variant="overline" color={selected ? colors.brand : colors.textSecondary}>
          {stateLabel}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={stateLabel ? `${label}, ${stateLabel}` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.7 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { minHeight: touchTarget.min, justifyContent: 'center', maxWidth: '100%' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: touchTarget.min,
  },
  selected: { backgroundColor: colors.accentSoft, borderColor: colors.brand },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
});
