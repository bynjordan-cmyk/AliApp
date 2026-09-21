import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../tokens';

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  testID?: string;
};

/** Standard page container: white background, generous gutters, safe areas. */
export function Screen({ children, scroll = true, padded = true, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const contentStyle = [
    padded && styles.padded,
    { paddingBottom: insets.bottom + spacing.xxxl },
  ];

  if (!scroll) {
    return (
      <View testID={testID} style={[styles.root, contentStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      testID={testID}
      style={styles.root}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
});
