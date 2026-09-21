import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, elevation, radius, spacing } from '../tokens';

export type CardProps = {
  children: ReactNode;
  tone?: 'plain' | 'accent' | 'info' | 'highlight' | 'calm';
  style?: ViewStyle;
  testID?: string;
};

const toneBackground: Record<NonNullable<CardProps['tone']>, string> = {
  plain: colors.surface,
  accent: colors.accentSoft,
  info: colors.infoSoft,
  highlight: colors.highlightSoft,
  calm: colors.calmSoft,
};

export function Card({ children, tone = 'plain', style, testID }: CardProps) {
  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: toneBackground[tone] }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...elevation.card,
  },
});
