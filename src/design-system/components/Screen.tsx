import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTENT_MAX_WIDTH, useLayout } from '../responsive';
import { colors, spacing } from '../tokens';

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Ancho máximo de la columna. Se amplía en pantallas que usan dos columnas. */
  maxWidth?: number;
  testID?: string;
};

/**
 * Contenedor de página: fondo blanco, márgenes generosos y áreas seguras.
 *
 * En pantallas anchas el contenido se limita a una columna centrada
 * (`CONTENT_MAX_WIDTH`) en lugar de estirarse de lado a lado, que es lo que
 * convierte una app móvil en una web ilegible.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  maxWidth = CONTENT_MAX_WIDTH,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();

  const column = (
    <View
      style={[
        styles.column,
        { maxWidth },
        padded && styles.padded,
        isWide && padded && styles.paddedWide,
        { paddingBottom: insets.bottom + spacing.xxxl },
      ]}
    >
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <View testID={testID} style={styles.root}>
        {column}
      </View>
    );
  }

  return (
    <ScrollView
      testID={testID}
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {column}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screen },
  scrollContent: { flexGrow: 1 },
  column: {
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  paddedWide: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, gap: spacing.xl },
});
