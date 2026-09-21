import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { ReminderPrompt } from '@/features/notifications/ReminderPrompt';
import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { useCreateBabyFoodEntry, useCreateBreastfeed } from '@/features/feeding/useFeeding';
import { endBreastfeed } from '@/features/feeding/feeding.service';
import { useOpenBreastfeed } from '@/features/feeding/useOpenBreastfeed';
import { useFoods } from '@/features/food/useFoods';
import { MediaStrip } from '@/features/media/MediaStrip';
import { OccurredAtField } from '@/features/records/OccurredAtField';
import { useCreateSymptom } from '@/features/symptoms/useSymptoms';
import { createDiaperEvent } from '@/features/diapers/diaper.service';
import { createMedicationEvent } from '@/features/medication/medication.service';
import { quickLogActions } from '@/features/baby/feeding-stage';
import { formatTime } from '@/lib/dates';
import { useI18n, useT } from '@/lib/i18n';
import type { DiaperType, FeedKind, SymptomSeverity } from '@/types/domain';

type QuickLogKind = 'breastfeed' | 'formula' | 'pumped_milk' | 'food' | 'diaper' | 'symptom' | 'medication';

/**
 * Registro rápido · "registra ahora, completa después".
 *
 * El objetivo es que una persona agotada, con un brazo ocupado, guarde un
 * evento en segundos. De ahí las reglas de esta pantalla:
 *
 *   · el mínimo de cada tipo es de verdad el mínimo (tipo + hora),
 *   · la hora viene puesta en "ahora" y se corrige de un toque,
 *   · NINGÚN campo opcional bloquea el botón de guardar,
 *   · lo que falte se puede añadir luego desde el detalle del registro.
 *
 * Guardar con pocos datos no es registrar mal. Es registrar.
 */
export default function QuickLogScreen() {
  const t = useT();
  const router = useRouter();
  const { baby, household, membership } = useActiveBaby();
  const { profile } = useSession();
  const [kind, setKind] = useState<QuickLogKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mostrarTodas, setMostrarTodas] = useState(false);

  // El orden depende de la etapa del bebé: quien aún toma solo leche no
  // debería tropezar con "Comida" en cada registro. Nada queda oculto: lo que
  // no sale de primeras está en "Más".
  const acciones = quickLogActions(baby);

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

      <Text variant="caption" color={colors.textSecondary}>
        {t('quickLog.completeLater')}
      </Text>

      <View style={styles.kinds}>
        {(mostrarTodas ? [...acciones.primary, ...acciones.more] : acciones.primary).map(
          (value) =>
            [value, t(`quickLog.${value}` as 'quickLog.food')] as const,
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

      {!kind && acciones.more.length > 0 ? (
        <Button
          variant="ghost"
          label={mostrarTodas ? t('quickLog.showLess') : t('quickLog.showMore')}
          onPress={() => setMostrarTodas((v) => !v)}
        />
      ) : null}

      {/* Leer una etiqueta no crea un registro, pero se busca desde aquí. */}
      {!kind ? (
        <Button
          variant="secondary"
          label={t('quickLog.labelScan')}
          onPress={() => router.push('/label-scan')}
        />
      ) : null}

      {error ? (
        <Text variant="caption" color={colors.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {kind === 'breastfeed' ? (
        <BreastfeedTimer
          babyId={baby.id}
          context={context}
          onDone={() => router.back()}
          onError={setError}
        />
      ) : null}
      {kind === 'formula' || kind === 'pumped_milk' ? (
        <BottleForm
          key={kind}
          feedKind={kind}
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

/**
 * Lactancia en dos toques.
 *
 * Uno para empezar, otro para terminar, y nada más. El lado, las notas y la
 * duración exacta se corrigen después desde el detalle: pedirlos en el momento
 * es pedirle a alguien que suelte al bebé para rellenar un formulario.
 */
function BreastfeedTimer({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const abierta = useOpenBreastfeed(babyId);
  const crear = useCreateBreastfeed(context);
  const [cerrando, setCerrando] = useState(false);

  const enCurso = abierta.data;

  if (enCurso) {
    return (
      <Card>
        <Text variant="subtitle">{t('quickLog.breastfeed')}</Text>
        <Text>
          {t('quickLog.feedRunning', { time: formatTime(enCurso.started_at, locale) })}
        </Text>
        <Button
          label={t('quickLog.endFeed')}
          loading={cerrando}
          onPress={() => {
            setCerrando(true);
            endBreastfeed(enCurso.id)
              .then(() => {
                void queryClient.invalidateQueries({ queryKey: ['babies', babyId] });
                onDone();
              })
              .catch((cause: Error) => onError(cause.message))
              .finally(() => setCerrando(false));
          }}
        />
        <Button
          variant="ghost"
          label={t('record.completeNow')}
          onPress={() => router.push(`/record/breastfeed/${enCurso.id}`)}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Text variant="subtitle">{t('quickLog.breastfeed')}</Text>
      <Text variant="caption" color={colors.textSecondary}>
        {t('quickLog.completeLater')}
      </Text>
      <Button
        label={t('quickLog.startFeed')}
        loading={crear.isPending || abierta.isLoading}
        onPress={() => {
          crear.mutate(
            { babyId, startedAt: new Date().toISOString(), feedKind: 'breast' },
            { onSuccess: onDone, onError: (cause) => onError(cause.message) },
          );
        }}
      />
    </Card>
  );
}

/**
 * Biberón: fórmula o leche extraída.
 *
 * Mínimo real: la vía y la hora, que ya vienen puestas. Cantidad y marca son
 * opcionales y no bloquean nada.
 */
function BottleForm({
  feedKind,
  babyId,
  context,
  onDone,
  onError,
}: FormProps & { feedKind: Exclude<FeedKind, 'breast'> }) {
  const t = useT();
  const ahora = useMemo(() => new Date(), []);
  const [occurredAt, setOccurredAt] = useState(() => ahora.toISOString());
  const [cantidad, setCantidad] = useState('');
  const [marca, setMarca] = useState('');
  const [detalle, setDetalle] = useState(false);
  const mutation = useCreateBreastfeed(context);

  const mililitros = Number.parseInt(cantidad.replace(/[^\d]/g, ''), 10);

  return (
    <Card>
      <Text variant="subtitle">{t(`feedKind.${feedKind}` as 'feedKind.formula')}</Text>

      <OccurredAtField
        label={t('quickLog.occurredAt')}
        value={occurredAt}
        onChange={setOccurredAt}
        now={ahora}
      />

      <Button
        variant="ghost"
        label={detalle ? t('common.close') : t('quickLog.moreOptions')}
        onPress={() => setDetalle((v) => !v)}
      />

      {detalle ? (
        <View style={styles.detalle}>
          <Input
            label={`${t('quickLog.amountMl')} · ${t('common.optional')}`}
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="number-pad"
          />
          <Input
            label={`${t('quickLog.brand')} · ${t('common.optional')}`}
            value={marca}
            onChangeText={setMarca}
          />
        </View>
      ) : null}

      <Button
        label={t('quickLog.saveMinimum')}
        loading={mutation.isPending}
        onPress={() => {
          mutation.mutate(
            {
              babyId,
              startedAt: occurredAt,
              feedKind,
              amountMl: Number.isFinite(mililitros) && mililitros > 0 ? mililitros : undefined,
              brand: marca.trim() ? marca.trim() : undefined,
            },
            { onSuccess: onDone, onError: (cause) => onError(cause.message) },
          );
        }}
      />
    </Card>
  );
}

/** Comida. Mínimo: un alimento y la hora, que ya viene puesta. */
function FoodForm({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const foods = useFoods();
  const ahora = useMemo(() => new Date(), []);
  const [occurredAt, setOccurredAt] = useState(() => ahora.toISOString());
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

      <OccurredAtField
        label={t('quickLog.occurredAt')}
        value={occurredAt}
        onChange={setOccurredAt}
        now={ahora}
      />

      <Button
        label={t('common.save')}
        disabled={selected.length === 0}
        loading={mutation.isPending}
        onPress={() => {
          mutation.mutate(
            {
              babyId,
              occurredAt,
              items: selected.map((foodId) => ({ foodId, isFirstExposure: false })),
            },
            { onSuccess: onDone, onError: (cause) => onError(cause.message) },
          );
        }}
      />
    </Card>
  );
}

/**
 * Pañal.
 *
 * El mínimo es un toque: el tipo. Todo el detalle clínico/contextual vive tras
 * "más opciones", que es divulgación progresiva (§15): quien tiene prisa
 * guarda en dos toques y quien quiere detallar, detalla.
 */
function DiaperForm({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const ahora = useMemo(() => new Date(), []);
  const [occurredAt, setOccurredAt] = useState(() => ahora.toISOString());
  const [type, setType] = useState<DiaperType | null>(null);
  const [detalle, setDetalle] = useState(false);
  const [amount, setAmount] = useState<'scant' | 'moderate' | 'large' | undefined>(undefined);
  const [mucus, setMucus] = useState(false);
  const [blood, setBlood] = useState(false);
  const [residue, setResidue] = useState(false);
  const [straining, setStraining] = useState(false);
  const [odor, setOdor] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const esDeposicion = type === 'stool' || type === 'both';

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

      <OccurredAtField
        label={t('quickLog.occurredAt')}
        value={occurredAt}
        onChange={setOccurredAt}
        now={ahora}
      />

      {esDeposicion ? (
        <Button
          variant="ghost"
          label={detalle ? t('common.close') : t('quickLog.moreOptions')}
          onPress={() => setDetalle((v) => !v)}
        />
      ) : null}

      {esDeposicion && detalle ? (
        <View style={styles.detalle}>
          <Text variant="caption" color={colors.textSecondary}>
            {t('diaper.amount')}
          </Text>
          <View style={styles.kinds}>
            {(['scant', 'moderate', 'large'] as const).map((value) => (
              <Chip
                key={value}
                label={t(`diaper.amount_${value}` as 'diaper.amount_scant')}
                selected={amount === value}
                onPress={() => setAmount(amount === value ? undefined : value)}
              />
            ))}
          </View>

          <View style={styles.kinds}>
            <Chip label={t('diaper.mucus')} selected={mucus} onPress={() => setMucus(!mucus)} />
            <Chip label={t('diaper.blood')} selected={blood} onPress={() => setBlood(!blood)} />
            <Chip
              label={t('diaper.foodResidue')}
              selected={residue}
              onPress={() => setResidue(!residue)}
            />
            <Chip
              label={t('diaper.straining')}
              selected={straining}
              onPress={() => setStraining(!straining)}
            />
            <Chip label={t('diaper.odor')} selected={odor} onPress={() => setOdor(!odor)} />
          </View>

          <Input label={t('common.notes')} value={notes} onChangeText={setNotes} multiline />
        </View>
      ) : null}

      <Button
        label={t('quickLog.saveMinimum')}
        disabled={!type}
        loading={saving}
        onPress={() => {
          if (!type) return;
          setSaving(true);
          createDiaperEvent(
            {
              babyId,
              occurredAt,
              diaperType: type,
              stoolAmount: esDeposicion ? amount : undefined,
              mucus: esDeposicion && mucus ? true : undefined,
              bloodObserved: esDeposicion && blood ? true : undefined,
              visibleFoodResidue: esDeposicion && residue ? true : undefined,
              straining: esDeposicion && straining ? true : undefined,
              unusualOdor: esDeposicion && odor ? true : undefined,
              notes: notes.trim() ? notes.trim() : undefined,
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

/**
 * Registro de síntoma.
 *
 * No hay ningún campo de "alimento sospechoso": un síntoma se registra solo y
 * relacionarlo con exposiciones es un paso aparte y explícito (§27).
 */
function SymptomForm({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const router = useRouter();
  const ahora = useMemo(() => new Date(), []);
  const [occurredAt, setOccurredAt] = useState(() => ahora.toISOString());
  const [symptomType, setSymptomType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<SymptomSeverity | undefined>(undefined);
  // Id del síntoma recién guardado: con él se ofrece el recordatorio y se
  // pueden adjuntar fotos sin salir de la hoja.
  const [guardado, setGuardado] = useState<string | null>(null);
  const mutation = useCreateSymptom(context);

  if (guardado) {
    return (
      <View style={styles.detalle}>
        <ReminderPrompt
          category="symptom_followup"
          title={t('reminders.category.symptom_followup')}
          babyId={babyId}
          relatedEntityType="symptom"
          relatedEntityId={guardado}
          onDismiss={onDone}
        />
        <Card>
          <Text variant="subtitle">{t('common.photos')}</Text>
          <MediaStrip entityType="symptom" entityId={guardado} category="skin" />
          <Text variant="caption" color={colors.textSecondary}>
            {t('quickLog.savedComplete')}
          </Text>
          <Button
            variant="secondary"
            label={t('record.completeNow')}
            onPress={() => router.push(`/record/symptom/${guardado}`)}
          />
          <Button label={t('common.done')} onPress={onDone} />
        </Card>
      </View>
    );
  }

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

      <OccurredAtField
        label={t('quickLog.occurredAt')}
        value={occurredAt}
        onChange={setOccurredAt}
        now={ahora}
      />

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
        label={t('quickLog.saveMinimum')}
        disabled={!symptomType}
        loading={mutation.isPending}
        onPress={() => {
          if (!symptomType) return;
          mutation.mutate(
            { babyId, symptomType, startedAt: occurredAt, severity },
            {
              onSuccess: (symptom) => setGuardado(symptom.id),
              onError: (cause) => onError(cause.message),
            },
          );
        }}
      />
    </Card>
  );
}

function MedicationForm({ babyId, context, onDone, onError }: FormProps) {
  const t = useT();
  const ahora = useMemo(() => new Date(), []);
  const [occurredAt, setOccurredAt] = useState(() => ahora.toISOString());
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

      <OccurredAtField
        label={t('quickLog.occurredAt')}
        value={occurredAt}
        onChange={setOccurredAt}
        now={ahora}
      />

      <Button
        label={t('quickLog.saveMinimum')}
        disabled={name.trim().length === 0}
        loading={saving}
        onPress={() => {
          setSaving(true);
          createMedicationEvent(
            {
              babyId,
              name: name.trim(),
              doseText: doseText.trim() ? doseText.trim() : undefined,
              occurredAt,
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
  detalle: { gap: spacing.sm },
  foodList: { maxHeight: 240 },
});
