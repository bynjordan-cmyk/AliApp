import { ScrollView, StyleSheet } from 'react-native';

import { Chip, spacing } from '@/design-system';
import { deriveBabyAge } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

import { useActiveBaby } from './ActiveBabyProvider';

/** Selector de bebé. La edad se calcula aquí a partir de birth_date (§5). */
export function BabySelector() {
  const { babies, baby, setBabyId } = useActiveBaby();
  const { locale } = useI18n();

  if (babies.length <= 1) return null;

  return (
    <ScrollView
      horizontal
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
            onPress={() => setBabyId(item.id)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
});
