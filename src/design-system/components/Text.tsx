import { Platform, StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '../tokens';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: string;
  center?: boolean;
};

export function Text({
  variant = 'body',
  color = colors.textPrimary,
  center = false,
  style,
  ...rest
}: TextProps) {
  const variantStyle = typography[variant];
  return (
    <RNText
      // Respect the OS font-size setting, but keep layouts usable (§21).
      maxFontSizeMultiplier={1.6}
      style={[
        styles.base,
        {
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontWeight: variantStyle.fontWeight,
          color,
        },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  center: { textAlign: 'center' },
});
