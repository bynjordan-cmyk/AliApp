import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTENT_MAX_WIDTH, useLayout } from '../responsive';
import { colors, spacing } from '../tokens';

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  maxWidth?: number;
  testID?: string;
  bottomSpace?: number;
};

/** Shared native safe areas and keyboard behavior, with a centered wide-screen column. */
export function Screen({
  children,
  scroll = true,
  padded = true,
  maxWidth = CONTENT_MAX_WIDTH,
  testID,
  bottomSpace = 0,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  const column = (
    <View
      style={[
        styles.column,
        { maxWidth },
        padded && styles.padded,
        {
          paddingTop: insets.top + (isWide ? spacing.xxl : spacing.xl),
          paddingBottom: insets.bottom + spacing.xxxl + bottomSpace,
        },
      ]}
    >
      {children}
    </View>
  );
  if (!scroll)
    return (
      <View testID={testID} style={styles.root}>
        {column}
      </View>
    );
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        testID={testID}
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {column}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  scrollContent: { flexGrow: 1 },
  column: { width: '100%', alignSelf: 'center', flexGrow: 1 },
  padded: { paddingHorizontal: spacing.xl, gap: spacing.xl },
});
