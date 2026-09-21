import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  EventOption,
  Input,
  PageHeader,
  Button,
  Card,
  Chip,
  Screen,
  Text,
  colors,
  spacing,
} from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { useCreateBabyFoodEntry, useCreateBreastfeed } from '@/features/feeding/useFeeding';
import { useFoods } from '@/features/food/useFoods';
import { useCreateSymptom } from '@/features/symptoms/useSymptoms';
import { createDiaperEvent } from '@/features/diapers/diaper.service';
import { createMedicationEvent } from '@/features/medication/medication.service';
import { useT } from '@/lib/i18n';
import type { BreastSide, DiaperType, SymptomSeverity } from '@/types/domain';

type QuickLogKind = 'breastfeed' | 'food' | 'diaper' | 'symptom' | 'medication';

/**
 * Hoja de registro rápido (§15).
 *
 * Regla de diseño: como mucho 3 decisiones después de pulsar "+".
 *   1. qué tipo de evento
 *   2. el dato mínimo de ese evento (lado, tipo de pañal, alimento…)
 *   3. guardar
 *
 * Todo lo demás (hora distinta de ahora, notas, detalles clínicos) aparece solo
 * si se despliega "más opciones": divulgación progresiva.
 */
export default function QuickLogScreen() {
  const t = useT();
  const router = useRouter();
  const { baby, household, membership } = useActiveBaby();
  const { profile } = useSession();
  const [kind, setKind] = useState<QuickLogKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const context = {
    householdId: household?.id ?? '',
    createdBy: profile?.id ?? '',
  };

  const canLog = membership?.status === 'active' && membership.role !== 'professional_viewer';

  if (!baby || !household || !profile) {
    return (
      <Screen>
        <Text variant="title">{t('quickLog.title')}</Text>
        <Text color={colors.textSecondary}>{t('today.noBaby')}</Text>
      </Screen>
    );
  }

  if (!canLog) {
    return (
      <Screen>
        <Text variant="title">{t('quickLog.title')}</Text>
        <Text color={colors.textSecondary}>{t('roles.professional_viewer')}</Text>
        <Button variant="secondary" label={t('common.close')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={t('quickLog.title')} icon="add-outline" />

      <View style={styles.kinds}>
        {(
          [
            ['breastfeed', t('quickLog.breastfeed')],
            ['food', t('quickLog.food')],
            ['diaper', t('quickLog.diaper')],
            ['symptom', t('quickLog.symptom')],
            ['medication', t('quickLog.medication')],
          ] as const
        ).map(([value, label]) =>
          kind ? (
            <Chip
              key={value}
              label={label}
              selected={kind === value}
              onPress={() => {
                setKind(value);
                setError(null);
              }}
            />
          ) : (
            <EventOption
              key={value}
              kind={value}
              label={label}
              selected={kind === value}
              onPress={() => {
                setKind(value);
                setError(null);
              }}
            />
          ),
        )}
      </View>

      {error ? (
        <Text variant="caption" color={colors.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {kind === 'breastfeed' ? (
        <BreastfeedForm
          babyId={baby.id}
          context={context}
          onDone={() => router.back()}
          onError={setError}
        />
      ) : null}
      {kind === 'food' ? (
        <FoodForm
          babyId={baby.id}
          context={context}
          onDone={() => router.back()}
          onError={setError}
        />
      ) : null}
      {kind === 'diaper' ? (
        <DiaperForm
          babyId={baby.id}
          context={context}
          onDone={() => router.back()}
          onError={setError}
        />
      ) : null}
      {kind === 'symptom' ? (
        <SymptomForm
          babyId={baby.id}
          context={context}
          onDone={() => router.back()}
          onError={setError}
        />
      ) : null}
      {kind === 'medication' ? (
        <MedicationForm
          babyId={baby.id}
          context={context}
          onDone={() => router.back()}
          onError={setError}
        />
      ) : null}

      <Button variant="ghost" label={t('common.cancel')} onPress={() => router.back()} />
    </Screen>
  );
}

type FormProps = {
  babyId: string;
  context: { householdId: string; createdBy: string };
  onDone: () => void;
  onError: (message: string) => void;
};

function BreastfeedForm({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const [side, setSide] = useState<BreastSide | undefined>(undefined);
  const mutation = useCreateBreastfeed(context);

  return (
    <Card>
      <Text variant="subtitle">{t('quickLog.breastfeed')}</Text>
      <View style={styles.kinds}>
        {(['left', 'right', 'both'] as const).map((value) => (
          <Chip
            key={value}
            label={t(`breastfeed.${value}`)}
            selected={side === value}
            onPress={() => setSide(value)}
          />
        ))}
      </View>
      <Button
        label={t('common.save')}
        loading={mutation.isPending}
        onPress={() => {
          mutation.mutate(
            { babyId, startedAt: new Date().toISOString(), side },
            { onSuccess: onDone, onError: (cause) => onError(cause.message) },
          );
        }}
      />
    </Card>
  );
}

function FoodForm({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const foods = useFoods();
  const [selected, setSelected] = useState<string[]>([]);
  const mutation = useCreateBabyFoodEntry(context);

  return (
    <Card>
      <Text variant="subtitle">{t('food.items')}</Text>
      <ScrollView style={styles.foodList}>
        <View style={styles.kinds}>
          {(foods.data ?? []).map((food) => (
            <Chip
              key={food.id}
              label={food.displayName}
              selected={selected.includes(food.id)}
              stateLabel={food.is_major_allergen ? '★' : undefined}
              onPress={() =>
                setSelected((current) =>
                  current.includes(food.id)
                    ? current.filter((id) => id !== food.id)
                    : [...current, food.id],
                )
              }
            />
          ))}
        </View>
      </ScrollView>
      <Button
        label={t('common.save')}
        disabled={selected.length === 0}
        loading={mutation.isPending}
        onPress={() => {
          mutation.mutate(
            {
              babyId,
              occurredAt: new Date().toISOString(),
              items: selected.map((foodId) => ({ foodId, isFirstExposure: false })),
            },
            { onSuccess: onDone, onError: (cause) => onError(cause.message) },
          );
        }}
      />
    </Card>
  );
}

function DiaperForm({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const [type, setType] = useState<DiaperType | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <Text variant="subtitle">{t('diaper.type')}</Text>
      <View style={styles.kinds}>
        {(['urine', 'stool', 'both'] as const).map((value) => (
          <Chip
            key={value}
            label={t(`diaper.${value}` as const)}
            selected={type === value}
            onPress={() => setType(value)}
          />
        ))}
      </View>
      <Button
        label={t('common.save')}
        disabled={!type}
        loading={saving}
        onPress={() => {
          if (!type) return;
          setSaving(true);
          createDiaperEvent(
            { babyId, occurredAt: new Date().toISOString(), diaperType: type },
            context,
          )
            .then(onDone)
            .catch((cause: Error) => onError(cause.message))
            .finally(() => setSaving(false));
        }}
      />
    </Card>
  );
}

/**
 * Registro de síntoma.
 *
 * No hay ningún campo de "alimento sospechoso": un síntoma se registra solo y
 * relacionarlo con exposiciones es un paso aparte y explícito (§27).
 */
function SymptomForm({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const [symptomType, setSymptomType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<SymptomSeverity | undefined>(undefined);
  const mutation = useCreateSymptom(context);

  const commonTypes = ['skin_rash', 'vomiting', 'diarrhea', 'irritability', 'cough'];

  return (
    <Card>
      <Text variant="subtitle">{t('health.symptoms')}</Text>
      <View style={styles.kinds}>
        {commonTypes.map((value) => (
          <Chip
            key={value}
            label={t(`symptom.${value}` as 'symptom.skin_rash')}
            selected={symptomType === value}
            onPress={() => setSymptomType(value)}
          />
        ))}
      </View>

      <Text variant="caption" color={colors.textSecondary}>
        {t('health.severity')} · {t('common.optional')}
      </Text>
      <View style={styles.kinds}>
        {([1, 2, 3] as const).map((value) => (
          <Chip
            key={value}
            label={t(`health.severity${value}` as 'health.severity1')}
            selected={severity === value}
            onPress={() => setSeverity(value)}
          />
        ))}
      </View>

      <Button
        label={t('common.save')}
        disabled={!symptomType}
        loading={mutation.isPending}
        onPress={() => {
          if (!symptomType) return;
          mutation.mutate(
            { babyId, symptomType, startedAt: new Date().toISOString(), severity },
            { onSuccess: onDone, onError: (cause) => onError(cause.message) },
          );
        }}
      />
    </Card>
  );
}

function MedicationForm({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const [name, setName] = useState('');
  const [doseText, setDoseText] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <Text variant="subtitle">{t('quickLog.medication')}</Text>
      <Input label={t('quickLog.medication')} value={name} onChangeText={setName} />
      <Text variant="caption" color={colors.textSecondary}>
        {t('common.optional')}
      </Text>
      {/* Texto libre: AliApp nunca calcula ni sugiere una dosis (§10). */}
      <Input label={t('quickLog.dose')} value={doseText} onChangeText={setDoseText} />
      <Button
        label={t('common.save')}
        disabled={name.trim().length === 0}
        loading={saving}
        onPress={() => {
          setSaving(true);
          createMedicationEvent(
            {
              babyId,
              name: name.trim(),
              doseText: doseText.trim() ? doseText.trim() : undefined,
              occurredAt: new Date().toISOString(),
            },
            context,
          )
            .then(onDone)
            .catch((cause: Error) => onError(cause.message))
            .finally(() => setSaving(false));
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  foodList: { maxHeight: 240 },
});
