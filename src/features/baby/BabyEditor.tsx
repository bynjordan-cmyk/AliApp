import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Button, Card, Chip, Input, SectionHeader, Text, colors, spacing } from '@/design-system';
import { deriveBabyAge } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';
import type { Baby, FeedingStage } from '@/types/domain';

import { updateBaby } from './baby.service';
import { FEEDING_STAGES, suggestStageFromAge } from './feeding-stage';

/**
 * Edición del bebé.
 *
 * La edad NO se edita: se deriva de la fecha de nacimiento y se recalcula
 * sola. Lo que sí se edita es la etapa y las vías de alimentación, porque eso
 * lo sabe la familia.
 *
 * La pregunta sobre sólidos es explícita y manda sobre cualquier estimación
 * por edad: AliApp no decide cuándo empieza un bebé con sólidos.
 */
export function BabyEditor({ baby }: { baby: Baby }) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();

  const [birthDate, setBirthDate] = useState(baby.birth_date ?? '');
  const [stage, setStage] = useState<FeedingStage | null>(baby.feeding_stage);
  const [solids, setSolids] = useState(baby.solids_started);
  const [breastfeeding, setBreastfeeding] = useState(baby.breastfeeding);
  const [formula, setFormula] = useState(baby.formula);
  const [pumped, setPumped] = useState(baby.pumped_milk);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const edad = deriveBabyAge(birthDate || null);
  const sugerida = suggestStageFromAge(birthDate || null);

  return (
    <Card>
      <SectionHeader title={t('profile.editBaby')} subtitle={t('profile.ageDerived')} />

      <Input
        label={t('onboarding.babyBirthDate')}
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="AAAA-MM-DD"
        autoCapitalize="none"
      />

      {edad ? (
        <Text variant="caption" color={colors.textSecondary}>
          {edad.months} {locale === 'es' ? 'meses' : 'months'} · {edad.days}{' '}
          {locale === 'es' ? 'días' : 'days'}
        </Text>
      ) : null}

      <SectionHeader title={t('profile.feedingStage')} />
      <View style={styles.chips}>
        {FEEDING_STAGES.map((valor) => (
          <Chip
            key={valor}
            label={t(`feedingStage.${valor}` as 'feedingStage.milk_only')}
            stateLabel={valor === sugerida && !stage ? t('profile.suggested') : undefined}
            selected={stage === valor}
            onPress={() => setStage(stage === valor ? null : valor)}
          />
        ))}
      </View>

      <View style={styles.fila}>
        <View style={styles.pregunta}>
          <Text>{t('profile.solidsStarted')}</Text>
          <Text variant="overline" color={colors.textSecondary}>
            {t('profile.solidsHint')}
          </Text>
        </View>
        <Switch
          value={solids}
          accessibilityLabel={t('profile.solidsStarted')}
          trackColor={{ true: colors.accent, false: colors.border }}
          onValueChange={setSolids}
        />
      </View>

      <SectionHeader title={t('profile.milkSources')} />
      {(
        [
          ['breastfeeding', breastfeeding, setBreastfeeding],
          ['formula', formula, setFormula],
          ['pumped_milk', pumped, setPumped],
        ] as const
      ).map(([clave, valor, set]) => (
        <View key={clave} style={styles.fila}>
          <Text>{t(`quickLog.${clave}` as 'quickLog.breastfeed')}</Text>
          <Switch
            value={valor}
            accessibilityLabel={t(`quickLog.${clave}` as 'quickLog.breastfeed')}
            trackColor={{ true: colors.accent, false: colors.border }}
            onValueChange={set}
          />
        </View>
      ))}

      {error ? (
        <Text variant="caption" color={colors.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Button
        label={t('common.save')}
        loading={guardando}
        onPress={() => {
          setGuardando(true);
          setError(null);
          updateBaby(baby.id, {
            birthDate: birthDate.trim() ? birthDate.trim() : null,
            feedingStage: stage,
            solidsStarted: solids,
            breastfeeding,
            formula,
            pumpedMilk: pumped,
          })
            .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.babies(baby.household_id) }))
            .catch((causa: Error) => setError(causa.message))
            .finally(() => setGuardando(false));
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
  },
  pregunta: { flex: 1, gap: spacing.xxs },
});
