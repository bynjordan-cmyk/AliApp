import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { colors, radius, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const [focused, setFocused] = useState(false);
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isGhost && styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled,
        focused && styles.focused,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.brand} /> : null}
      <Text
        variant="bodyStrong"
        style={{ flexShrink: 1 }}
        color={isPrimary ? colors.textOnCoral : colors.brand}
        center
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget.comfortable,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.transparent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: colors.transparent },
  focused: { borderColor: colors.brand },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
