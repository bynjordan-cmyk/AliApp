import { Pressable, StyleSheet, View } from 'react-native';

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
        tint ? { borderColor: tint } : null,
      ]}
    >
      {tint ? <View style={[styles.dot, { backgroundColor: tint }]} /> : null}
      <Text variant="caption" color={selected ? colors.textOnAccent : colors.textPrimary}>
        {label}
      </Text>
      {stateLabel ? (
        <Text variant="overline" color={selected ? colors.textOnAccent : colors.textSecondary}>
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
      style={styles.pressable}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { minHeight: touchTarget.min, justifyContent: 'center' },
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
  },
  selected: { backgroundColor: colors.brand, borderColor: colors.brand },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
});
