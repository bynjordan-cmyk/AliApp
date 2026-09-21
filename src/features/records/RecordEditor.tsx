import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Input, SectionHeader, Text, colors, spacing } from '@/design-system';
import { useI18n } from '@/lib/i18n';
import type { FeedKind, StoolAmount, SymptomSeverity } from '@/types/domain';

import { OccurredAtField } from './OccurredAtField';
import type { RecordDetail, RecordPatch } from './useRecord';

/**
 * Formulario de corrección de un registro.
 *
 * Dos reglas gobiernan esta pantalla:
 *
 *   1. TODO es corregible, incluida la hora. Nadie registra perfecto de
 *      madrugada, y volver a ordenar la historia real es exactamente lo que
 *      hace útil el historial.
 *   2. NADA es obligatorio salvo lo que ya lo era al crear el registro. Un
 *      campo que se dejó en blanco puede seguir en blanco para siempre.
 *
 * El estado vive como un "parche": solo viaja lo que alguien tocó, de modo que
 * dos personas del mismo hogar que corrigen cosas distintas no se pisan.
 */

export type RecordEditorProps = {
  detail: RecordDetail;
  canEdit: boolean;
  saving: boolean;
  now: Date;
  onSave: (patch: RecordPatch) => void;
};

export function RecordEditor({ detail, canEdit, saving, now, onSave }: RecordEditorProps) {
  const { t } = useI18n();
  const [patch, setPatch] = useState<Record<string, unknown>>({});

  // Valor efectivo de un campo: lo que se está editando o lo que hay guardado.
  const valor = <T,>(clave: string, guardado: T): T =>
    (clave in patch ? (patch[clave] as T) : guardado);

  const set = (clave: string, value: unknown) =>
    setPatch((actual) => ({ ...actual, [clave]: value }));

  const hayCambios = Object.keys(patch).length > 0;

  return (
    <Card>
      <SectionHeader title={t('common.edit')} subtitle={t('quickLog.completeLater')} />

      {!canEdit ? (
        <View style={styles.stack}>
          <Text variant="bodyStrong">{t('record.readOnly')}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {t('record.readOnlyHint')}
          </Text>
        </View>
      ) : null}

      <View pointerEvents={canEdit ? 'auto' : 'none'} style={canEdit ? undefined : styles.atenuado}>
        {detail.type === 'food_entry' ? (
          <View style={styles.stack}>
            <OccurredAtField
              label={t('quickLog.occurredAt')}
              value={valor('occurredAt', detail.row.occurred_at)}
              onChange={(iso) => set('occurredAt', iso)}
              now={now}
            />
            <Text variant="caption">{t('food.mealType')}</Text>
            <View style={styles.chips}>
              {(['breakfast', 'lunch', 'snack', 'dinner', 'other'] as const).map((momento) => {
                const actual = valor<string | null>('mealType', detail.row.meal_type);
                return (
                  <Chip
                    key={momento}
                    label={t(`mealType.${momento}` as 'mealType.breakfast')}
                    selected={actual === momento}
                    onPress={() => set('mealType', actual === momento ? null : momento)}
                  />
                );
              })}
            </View>
            <Notas value={valor('notes', detail.row.notes)} onChange={(v) => set('notes', v)} />
          </View>
        ) : null}

        {detail.type === 'breastfeed' ? (
          <View style={styles.stack}>
            <Text variant="caption">{t('quickLog.feedKind')}</Text>
            <View style={styles.chips}>
              {(['breast', 'formula', 'pumped_milk'] as const).map((tipo) => {
                const actual = valor<FeedKind>('feedKind', detail.row.feed_kind);
                return (
                  <Chip
                    key={tipo}
                    label={t(`feedKind.${tipo}` as 'feedKind.breast')}
                    selected={actual === tipo}
                    onPress={() => set('feedKind', tipo)}
                  />
                );
              })}
            </View>

            {valor<FeedKind>('feedKind', detail.row.feed_kind) === 'breast' ? (
              <View style={styles.stack}>
                <Text variant="caption">{t('record.field.side')}</Text>
                <View style={styles.chips}>
                  {(['left', 'right', 'both'] as const).map((lado) => {
                    const actual = valor<string | null>('side', detail.row.side);
                    return (
                      <Chip
                        key={lado}
                        label={t(`breastfeed.${lado}`)}
                        selected={actual === lado}
                        onPress={() => set('side', actual === lado ? null : lado)}
                      />
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.stack}>
                <Input
                  label={t('quickLog.amountMl')}
                  value={textoDeNumero(valor<number | null>('amountMl', detail.row.amount_ml))}
                  onChangeText={(texto) => set('amountMl', numeroDeTexto(texto))}
                  keyboardType="number-pad"
                />
                <Input
                  label={t('quickLog.brand')}
                  value={valor<string | null>('brand', detail.row.brand) ?? ''}
                  onChangeText={(texto) => set('brand', texto)}
                />
              </View>
            )}

            <OccurredAtField
              label={t('record.field.startedAt')}
              value={valor('startedAt', detail.row.started_at)}
              onChange={(iso) => set('startedAt', iso)}
              now={now}
            />

            <FinOpcional
              value={valor<string | null>('endedAt', detail.row.ended_at)}
              onChange={(iso) => set('endedAt', iso)}
              now={now}
            />

            <Notas value={valor('notes', detail.row.notes)} onChange={(v) => set('notes', v)} />
          </View>
        ) : null}

        {detail.type === 'diaper_event' ? (
          <View style={styles.stack}>
            <OccurredAtField
              label={t('quickLog.occurredAt')}
              value={valor('occurredAt', detail.row.occurred_at)}
              onChange={(iso) => set('occurredAt', iso)}
              now={now}
            />
            <Text variant="caption">{t('diaper.type')}</Text>
            <View style={styles.chips}>
              {(['urine', 'stool', 'both'] as const).map((tipo) => (
                <Chip
                  key={tipo}
                  label={t(`diaper.${tipo}` as const)}
                  selected={valor('diaperType', detail.row.diaper_type) === tipo}
                  onPress={() => set('diaperType', tipo)}
                />
              ))}
            </View>

            <Text variant="caption">{t('diaper.amount')}</Text>
            <View style={styles.chips}>
              {(['scant', 'moderate', 'large'] as const).map((cantidad) => {
                const actual = valor<StoolAmount | null>('stoolAmount', detail.row.stool_amount);
                return (
                  <Chip
                    key={cantidad}
                    label={t(`diaper.amount_${cantidad}` as 'diaper.amount_scant')}
                    selected={actual === cantidad}
                    onPress={() => set('stoolAmount', actual === cantidad ? null : cantidad)}
                  />
                );
              })}
            </View>

            <View style={styles.chips}>
              <Booleano
                label={t('diaper.mucus')}
                value={valor('mucus', detail.row.mucus)}
                onChange={(v) => set('mucus', v)}
              />
              <Booleano
                label={t('diaper.blood')}
                value={valor('bloodObserved', detail.row.blood_observed)}
                onChange={(v) => set('bloodObserved', v)}
              />
              <Booleano
                label={t('diaper.foodResidue')}
                value={valor('visibleFoodResidue', detail.row.visible_food_residue)}
                onChange={(v) => set('visibleFoodResidue', v)}
              />
              <Booleano
                label={t('diaper.straining')}
                value={valor('straining', detail.row.straining)}
                onChange={(v) => set('straining', v)}
              />
              <Booleano
                label={t('diaper.odor')}
                value={valor('unusualOdor', detail.row.unusual_odor)}
                onChange={(v) => set('unusualOdor', v)}
              />
            </View>

            <Input
              label={t('diaper.consistency')}
              value={valor<string | null>('stoolConsistency', detail.row.stool_consistency) ?? ''}
              onChangeText={(texto) => set('stoolConsistency', texto)}
            />
            <Input
              label={t('diaper.color')}
              value={valor<string | null>('stoolColor', detail.row.stool_color) ?? ''}
              onChangeText={(texto) => set('stoolColor', texto)}
            />

            <Notas value={valor('notes', detail.row.notes)} onChange={(v) => set('notes', v)} />
          </View>
        ) : null}

        {detail.type === 'symptom' ? (
          <View style={styles.stack}>
            <Text variant="caption">{t('record.field.symptomType')}</Text>
            <View style={styles.chips}>
              {(['skin_rash', 'vomiting', 'diarrhea', 'irritability', 'cough'] as const).map(
                (tipo) => (
                  <Chip
                    key={tipo}
                    label={t(`symptom.${tipo}` as 'symptom.skin_rash')}
                    selected={valor('symptomType', detail.row.symptom_type) === tipo}
                    onPress={() => set('symptomType', tipo)}
                  />
                ),
              )}
            </View>

            <Text variant="caption">
              {t('health.severity')} · {t('common.optional')}
            </Text>
            <View style={styles.chips}>
              {([1, 2, 3] as const).map((nivel) => {
                const actual = valor<SymptomSeverity | null>(
                  'severity',
                  detail.row.severity as SymptomSeverity | null,
                );
                return (
                  <Chip
                    key={nivel}
                    label={t(`health.severity${nivel}` as 'health.severity1')}
                    selected={actual === nivel}
                    onPress={() => set('severity', actual === nivel ? null : nivel)}
                  />
                );
              })}
            </View>

            <OccurredAtField
              label={t('record.field.startedAt')}
              value={valor('startedAt', detail.row.started_at)}
              onChange={(iso) => set('startedAt', iso)}
              now={now}
            />
            <FinOpcional
              value={valor<string | null>('endedAt', detail.row.ended_at)}
              onChange={(iso) => set('endedAt', iso)}
              now={now}
            />

            <Notas value={valor('notes', detail.row.notes)} onChange={(v) => set('notes', v)} />
          </View>
        ) : null}

        {detail.type === 'reaction_episode' ? (
          <View style={styles.stack}>
            <Text variant="caption">{t('record.field.status')}</Text>
            <View style={styles.chips}>
              {(
                [
                  ['open', 'health.episodeOpen'],
                  ['resolved', 'health.episodeResolved'],
                ] as const
              ).map(([estado, clave]) => (
                <Chip
                  key={estado}
                  label={t(clave)}
                  selected={valor('status', detail.row.status) === estado}
                  onPress={() => set('status', estado)}
                />
              ))}
            </View>
            <OccurredAtField
              label={t('record.field.startedAt')}
              value={valor('startedAt', detail.row.started_at)}
              onChange={(iso) => set('startedAt', iso)}
              now={now}
            />
            <FinOpcional
              value={valor<string | null>('endedAt', detail.row.ended_at)}
              onChange={(iso) => set('endedAt', iso)}
              now={now}
            />
            <Notas value={valor('notes', detail.row.notes)} onChange={(v) => set('notes', v)} />
          </View>
        ) : null}

        {detail.type === 'medication_event' ? (
          <View style={styles.stack}>
            <Input
              label={t('record.field.name')}
              value={valor('name', detail.row.name)}
              onChangeText={(texto) => set('name', texto)}
            />
            {/* Texto libre. AliApp no calcula ni sugiere dosis (§10). */}
            <Input
              label={t('quickLog.dose')}
              value={valor<string | null>('doseText', detail.row.dose_text) ?? ''}
              onChangeText={(texto) => set('doseText', texto)}
            />
            <Input
              label={t('record.field.reason')}
              value={valor<string | null>('reasonText', detail.row.reason_text) ?? ''}
              onChangeText={(texto) => set('reasonText', texto)}
            />
            <OccurredAtField
              label={t('quickLog.occurredAt')}
              value={valor('occurredAt', detail.row.occurred_at)}
              onChange={(iso) => set('occurredAt', iso)}
              now={now}
            />
            <Notas value={valor('notes', detail.row.notes)} onChange={(v) => set('notes', v)} />
          </View>
        ) : null}
      </View>

      <Button
        label={t('common.save')}
        disabled={!canEdit || !hayCambios}
        loading={saving}
        onPress={() => {
          onSave(patch as RecordPatch);
          setPatch({});
        }}
      />
    </Card>
  );
}

function Notas({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <Input
      label={`${t('common.notes')} · ${t('common.optional')}`}
      value={value ?? ''}
      onChangeText={onChange}
      multiline
    />
  );
}

/**
 * Hora de fin.
 *
 * Es el campo que más se completa después: se empieza una toma y nadie vuelve
 * a mirar el teléfono. Por eso "terminar ahora" está a un toque y "sin hora de
 * fin" sigue siendo una respuesta válida.
 */
function FinOpcional({
  value,
  onChange,
  now,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  now: Date;
}) {
  const { t } = useI18n();

  if (!value) {
    return (
      <View style={styles.chips}>
        <Chip label={t('quickLog.endFeed')} onPress={() => onChange(now.toISOString())} />
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <OccurredAtField label={t('record.field.endedAt')} value={value} onChange={onChange} now={now} />
      <View style={styles.chips}>
        <Chip label={t('record.emptyValue')} onPress={() => onChange(null)} />
      </View>
    </View>
  );
}

/**
 * Observación de sí/no.
 *
 * Tres estados de verdad: sí, no, y "no lo miré". El tercero es legítimo y se
 * representa dejando el chip sin marcar.
 */
function Booleano({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return <Chip label={label} selected={value === true} onPress={() => onChange(value ? null : true)} />;
}

function textoDeNumero(value: number | null): string {
  return value === null || value === undefined ? '' : String(value);
}

function numeroDeTexto(texto: string): number | null {
  const limpio = texto.replace(/[^\d]/g, '');
  if (!limpio) return null;
  return Number.parseInt(limpio, 10);
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  atenuado: { opacity: 0.5 },
});
