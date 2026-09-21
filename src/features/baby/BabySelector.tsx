import { ScrollView, StyleSheet } from 'react-native';

import { Chip, spacing } from '@/design-system';
import { deriveBabyAge } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

import { useActiveBaby } from './ActiveBabyProvider';

/** Selector de bebé. La edad se calcula aquí a partir de birth_date (§5). */
export function BabySelector() {
  const { babies, baby, setBabyId } = useActiveBaby();
  const { locale } = useI18n();

  if (babies.length === 0) return null;

  return (
    <ScrollView
      horizontal
      style={styles.scroller}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {babies.map((item) => {
        const age = deriveBabyAge(item.birth_date);
        const ageLabel = age
          ? locale === 'es'
            ? `${age.months} meses`
            : `${age.months} months`
          : undefined;

        return (
          <Chip
            key={item.id}
            label={item.name}
            stateLabel={ageLabel}
            selected={item.id === baby?.id}
            onPress={babies.length > 1 ? () => setBabyId(item.id) : undefined}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: { flexGrow: 0, flexShrink: 0 },
  row: { gap: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center' },
});
