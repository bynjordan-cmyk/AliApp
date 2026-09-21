import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Divider,
  EmptyState,
  ListItem,
  PageHeader,
  QueryState,
  Screen,
  SectionHeader,
  Text,
  colors,
  spacing,
} from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { canEditEvent } from '@/features/caregivers/permissions';
import { useFoodNames } from '@/features/food/useFoodNames';
import { MediaStrip } from '@/features/media/MediaStrip';
import { RecordEditor } from '@/features/records/RecordEditor';
import {
  canDuplicate,
  duplicateRecord,
  softDeleteRecord,
  supportsPhotos,
} from '@/features/records/record-actions';
import { isRecordType } from '@/features/records/record.service';
import { describeRevision } from '@/features/records/revisions';
import { useRecord, useRecordRevisions, useUpdateRecord } from '@/features/records/useRecord';
import { describeInterval } from '@/features/reactions/exposure-window';
import { useExposureCandidates } from '@/features/reactions/useReactionBuilder';
import { formatDate, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { TimelineItemType } from '@/types/timeline';

/**
 * Detalle de un registro.
 *
 * Existe por una razón concreta: corregir algo no debe obligar a navegar hasta
 * otra sección. Se toca el evento en la línea de tiempo y aquí está TODO —ver,
 * editar, añadir una foto, añadir una nota, ver qué se registró antes,
 * duplicarlo o retirarlo—.
 *
 * Lo que se ve antes que nada es el hecho: qué fue y cuándo ocurrió. Si alguien
 * lo corrigió después, se dice con discreción ("Editado"), nunca como un aviso
 * ni como un error.
 */

const TITULO_POR_TIPO = {
  food_entry: 'timeline.foodEntry',
  breastfeed: 'timeline.breastfeed',
  diaper_event: 'timeline.diaper',
  symptom: 'timeline.symptom',
  reaction_episode: 'timeline.episode',
  medication_event: 'timeline.medication',
} as const;

const OCURRIDO_EN = {
  food_entry: 'occurred_at',
  breastfeed: 'started_at',
  diaper_event: 'occurred_at',
  symptom: 'started_at',
  reaction_episode: 'started_at',
  medication_event: 'occurred_at',
} as const;

export default function RecordDetailScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ type: string; id: string }>();
  const { baby, household, membership } = useActiveBaby();
  const { profile } = useSession();

  const tipo: TimelineItemType | null =
    typeof params.type === 'string' && isRecordType(params.type) ? params.type : null;
  const id = typeof params.id === 'string' ? params.id : null;

  const record = useRecord(tipo, id);
  const revisions = useRecordRevisions(tipo, id);
  const actualizar = useUpdateRecord(tipo, id, baby?.id ?? null);

  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // El reloj se lee una vez y se pasa hacia abajo: nadie lo consulta al pintar.
  const ahora = useMemo(() => new Date(), []);

  if (!tipo || !id) {
    return (
      <Screen>
        <PageHeader title={t('record.title')} />
        <EmptyState title={t('record.notFound')} description={t('record.notFoundHint')} />
        <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const detalle = record.data;
  const fila = detalle?.row;
  const ocurrioEn = fila ? ((fila as Record<string, string>)[OCURRIDO_EN[tipo]] ?? null) : null;

  const puedeEditar = canEditEvent(
    membership
      ? { role: membership.role, status: membership.status, overrides: undefined }
      : null,
    { createdBy: fila?.created_by ?? null, createdAt: fila?.created_at ?? '' },
    profile?.id ?? null,
    ahora,
  );

  return (
    <Screen>
      <PageHeader title={t(TITULO_POR_TIPO[tipo])} />

      <QueryState
        loading={record.isLoading}
        error={record.isError}
        onRetry={() => {
          void record.refetch();
        }}
      >
        {!detalle || !fila ? (
          <EmptyState title={t('record.notFound')} description={t('record.notFoundHint')} />
        ) : (
          <View style={styles.stack}>
            <Card>
              <Text variant="title">
                {ocurrioEn ? `${formatDate(ocurrioEn, locale)} · ${formatTime(ocurrioEn, locale)}` : ''}
              </Text>
              {fila.edited_at ? (
                <Text variant="caption" color={colors.textSecondary}>
                  {t('record.editedOn', { date: formatDate(fila.edited_at, locale) })}
                </Text>
              ) : null}
            </Card>

            {aviso ? (
              <Text variant="caption" color={colors.textSecondary} accessibilityRole="alert">
                {aviso}
              </Text>
            ) : null}
            {error ? (
              <Text variant="caption" color={colors.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            <RecordEditor
              detail={detalle}
              canEdit={puedeEditar}
              saving={actualizar.isPending}
              now={ahora}
              onSave={(patch) => {
                setError(null);
                actualizar.mutate(patch, {
                  onSuccess: () => setAviso(t('record.completeNow')),
                  onError: (cause) => setError(cause.message),
                });
              }}
            />

            {supportsPhotos(tipo) ? (
              <Card>
                <SectionHeader title={t('common.photos')} subtitle={t('media.documentation')} />
                <MediaStrip entityType={tipo} entityId={id} readOnly={!puedeEditar} />
              </Card>
            ) : null}

            {tipo === 'symptom' || tipo === 'diaper_event' ? (
              <QueRegistramosAntes babyId={baby?.id ?? null} instante={ocurrioEn} />
            ) : null}

            {tipo === 'symptom' ? (
              <Button
                variant="secondary"
                label={t('record.groupInEpisode')}
                onPress={() => router.push('/reaction-builder')}
              />
            ) : null}

            <Card>
              <SectionHeader title={t('record.history')} subtitle={t('record.historyHint')} />
              {(revisions.data ?? []).length === 0 ? (
                <Text variant="caption" color={colors.textSecondary}>
                  {t('record.historyEmpty')}
                </Text>
              ) : (
                (revisions.data ?? []).map((row) => {
                  const entrada = describeRevision(row);
                  return (
                    <View key={entrada.id} style={styles.revision}>
                      <Text variant="caption" color={colors.textSecondary}>
                        {formatDate(entrada.changedAt, locale)} ·{' '}
                        {formatTime(entrada.changedAt, locale)}
                      </Text>
                      {entrada.fields.map((campo) => (
                        <Text key={campo.column} variant="caption">
                          {campo.labelKey ? t(campo.labelKey) : campo.column}:{' '}
                          {t('record.changeFrom')} {formatearValor(campo.from, t('record.emptyValue'))} ·{' '}
                          {t('record.changeTo')} {formatearValor(campo.to, t('record.emptyValue'))}
                        </Text>
                      ))}
                      <Divider />
                    </View>
                  );
                })
              )}
            </Card>

            {canDuplicate(tipo) ? (
              <Button
                variant="secondary"
                label={t('record.duplicate')}
                accessibilityHint={t('record.duplicateHint')}
                disabled={!puedeEditar || ocupado}
                onPress={() => {
                  if (!household || !profile) return;
                  setOcupado(true);
                  setError(null);
                  duplicateRecord(detalle, {
                    householdId: household.id,
                    createdBy: profile.id,
                  })
                    .then(() => setAviso(t('record.duplicated')))
                    .catch((cause: Error) => setError(cause.message))
                    .finally(() => setOcupado(false));
                }}
              />
            ) : null}

            <Button
              variant="ghost"
              label={t('common.delete')}
              accessibilityHint={t('record.deleteHint')}
              disabled={!puedeEditar || ocupado}
              onPress={() => {
                setOcupado(true);
                setError(null);
                softDeleteRecord(tipo, id)
                  .then(() => router.back())
                  .catch((cause: Error) => setError(cause.message))
                  .finally(() => setOcupado(false));
              }}
            />
          </View>
        )}
      </QueryState>

      <Button variant="ghost" label={t('common.back')} onPress={() => router.back()} />
    </Screen>
  );
}

/**
 * Qué se había registrado antes.
 *
 * La ventana es un FILTRO DE CONSULTA. Enseña el orden de los hechos en el
 * tiempo y dice expresamente que eso no es una relación de causa (§10, §11).
 */
function QueRegistramosAntes({
  babyId,
  instante,
}: {
  babyId: string | null;
  instante: string | null;
}) {
  const { t, locale } = useI18n();
  const { nameForId } = useFoodNames();
  // La ventana de 6 h es un filtro para mirar hacia atrás, no un criterio clínico.
  const { candidates } = useExposureCandidates(babyId, instante, 6);

  return (
    <Card>
      <SectionHeader title={t('record.previousFood')} subtitle={t('reactions.windowHint')} />
      {candidates.length === 0 ? (
        <Text variant="caption" color={colors.textSecondary}>
          {t('diaper.nothingBefore')}
        </Text>
      ) : (
        candidates.map(({ exposure, minutesBefore }) => (
          <ListItem
            key={exposure.id}
            title={
              exposure.food_id
                ? nameForId(exposure.food_id)
                : t(`exposureSource.${exposure.source_type}` as 'exposureSource.breastfeed')
            }
            subtitle={describeInterval(minutesBefore, {
              hoursShort: t('common.hoursShort'),
              minutesShort: t('common.minutesShort'),
              before: t('diaper.beforeThis'),
            })}
            meta={formatTime(exposure.occurred_at, locale)}
          />
        ))
      )}
      <Text variant="caption" color={colors.textSecondary}>
        {t('diaper.noCausality')}
      </Text>
    </Card>
  );
}

function formatearValor(valor: unknown, vacio: string): string {
  if (valor === null || valor === undefined || valor === '') return vacio;
  if (typeof valor === 'boolean') return valor ? '✓' : '—';
  return String(valor);
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  revision: { gap: spacing.xxs },
});
