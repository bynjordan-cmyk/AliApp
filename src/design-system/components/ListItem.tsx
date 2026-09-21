import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

export type ListItemProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  /** Left accent colour. Always paired with `title`/`meta` text (§21). */
  tint?: string;
  onPress?: () => void;
  testID?: string;
};

export function ListItem({ title, subtitle, meta, tint, onPress, testID }: ListItemProps) {
  const body = (
    <View style={styles.row}>
      <View style={[styles.rail, tint ? { backgroundColor: tint } : null]} />
      <View style={styles.texts}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color={colors.textSecondary}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text variant="caption" color={colors.textSecondary}>
          {meta}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, meta].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget.comfortable,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rail: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  texts: { flex: 1, gap: spacing.xxs },
  pressed: { opacity: 0.7 },
});
