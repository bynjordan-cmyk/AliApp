import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

export const eventPresentation = {
  breastfeed: { icon: 'water-outline', background: colors.calmSoft },
  food: { icon: 'restaurant-outline', background: colors.accentSoft },
  diaper: { icon: 'happy-outline', background: colors.infoSoft },
  symptom: { icon: 'eye-outline', background: colors.highlightSoft },
  medication: { icon: 'bandage-outline', background: colors.calmSoft },
} as const;

export function EventOption({
  kind,
  label,
  selected,
  onPress,
}: {
  kind: keyof typeof eventPresentation;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const presentation = eventPresentation[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: presentation.background },
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={styles.icons}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name={presentation.icon} size={26} color={colors.brand} />
        {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.brand} /> : null}
      </View>
      <Text variant="bodyStrong">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexBasis: '46%',
    flexGrow: 1,
    minHeight: touchTarget.comfortable * 2,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.transparent,
    gap: spacing.md,
  },
  icons: { flexDirection: 'row', justifyContent: 'space-between' },
  selected: { borderColor: colors.brand },
  pressed: { opacity: 0.75 },
});
