import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing, touchTarget, typography } from '../tokens';
import { Text } from './Text';

export type InputProps = TextInputProps & { label: string; error?: string };

export function Input({ label, error, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text variant="caption">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityHint={error ?? props.accessibilityHint}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.brand}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, focused && styles.focused, error ? styles.invalid : null, style]}
      />
      {error ? (
        <Text variant="caption" color={colors.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  input: {
    minHeight: touchTarget.comfortable,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
  },
  focused: { borderColor: colors.brand, backgroundColor: colors.infoSoft },
  invalid: { borderColor: colors.error, backgroundColor: colors.accentSoft },
});
