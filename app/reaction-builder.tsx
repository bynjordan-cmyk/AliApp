import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
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
import { useFoodNames } from '@/features/food/useFoodNames';
import { MediaStrip } from '@/features/media/MediaStrip';
import {
  EXPOSURE_WINDOWS_HOURS,
  describeInterval,
  type ExposureWindowHours,
} from '@/features/reactions/exposure-window';
import { useExposureCandidates, useSaveEpisode } from '@/features/reactions/useReactionBuilder';
import { useSymptoms } from '@/features/symptoms/useSymptoms';
import { symptomTypeKey } from '@/features/timeline/timeline-labels';
import { formatDate, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

/**
 * Reaction Builder (§3 del encargo).
 *
 * Flujo: se parte de un síntoma ya registrado, se agrupan otros síntomas si
 * los hay, se revisan las exposiciones registradas antes, se elige cuáles
 * relacionar y se añaden notas y fotos.
 *
 * Lo que esta pantalla NUNCA hace:
 *   - decir que un alimento provocó el síntoma,
 *   - ordenar los candidatos por "probabilidad",
 *   - preseleccionar exposiciones por su cuenta.
 *
 * Lo que sí hace: contar cuánto tiempo pasó entre una cosa y otra, que es un
 * hecho medible, y dejar que la persona decida qué guardar junto.
 */
export default function ReactionBuilderScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ symptomId?: string }>();
  const { baby, household, membership } = useActiveBaby();
  const { profile } = useSession();
  const { nameForId } = useFoodNames();

  const symptoms = useSymptoms(baby?.id ?? null);
  const [seleccionSintomas, setSeleccionSintomas] = useState<string[]>(
    params.symptomId ? [params.symptomId] : [],
  );
  const [ventana, setVentana] = useState<ExposureWindowHours>(12);
  const [exposicionesElegidas, setExposicionesElegidas] = useState<string[]>([]);
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);

  // El episodio empieza en el síntoma más temprano de los seleccionados.
  const inicio = useMemo(() => {
    const elegidos = (symptoms.data ?? []).filter((s) => seleccionSintomas.includes(s.id));
    if (elegidos.length === 0) return null;
    return elegidos
      .map((s) => s.started_at)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] as string;
  }, [symptoms.data, seleccionSintomas]);

  const candidatos = useExposureCandidates(baby?.id ?? null, inicio, ventana);
  const guardar = useSaveEpisode({
    householdId: household?.id ?? '',
    createdBy: profile?.id ?? '',
  });

  const puedeGuardar =
    seleccionSintomas.length > 0 &&
    Boolean(baby && household && profile) &&
    membership?.status === 'active' &&
    membership.role !== 'professional_viewer';

  if (!baby || !household) {
    return (
      <Screen>
        <PageHeader title={t('reactions.title')} />
        <EmptyState title={t('today.noBaby')} description={t('today.noBabyHint')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title={t('reactions.title')} subtitle={t('reactions.subtitle')} />

      {/* Paso 1 · qué síntomas forman el episodio */}
      <Card>
        <SectionHeader title={t('reactions.step1')} subtitle={t('reactions.step1Hint')} />
        <QueryState
          loading={symptoms.isLoading}
          error={symptoms.isError}
          onRetry={() => {
            void symptoms.refetch();
          }}
        >
          {(symptoms.data ?? []).length === 0 ? (
            <EmptyState title={t('reactions.noSymptoms')} description={t('reactions.noSymptomsHint')} />
          ) : (
            <View style={styles.lista}>
              {(symptoms.data ?? []).slice(0, 12).map((symptom) => {
                const clave = symptomTypeKey(symptom.symptom_type);
                const elegido = seleccionSintomas.includes(symptom.id);

                return (
                  <Chip
                    key={symptom.id}
                    label={clave ? t(clave) : symptom.symptom_type}
                    stateLabel={`${formatDate(symptom.started_at, locale)} · ${formatTime(symptom.started_at, locale)}`}
                    selected={elegido}
                    onPress={() =>
                      setSeleccionSintomas((actual) =>
                        actual.includes(symptom.id)
                          ? actual.filter((id) => id !== symptom.id)
                          : [...actual, symptom.id],
                      )
                    }
                  />
                );
              })}
            </View>
          )}
        </QueryState>
      </Card>

      {/* Paso 2 · qué se registró antes */}
      <Card>
        <SectionHeader title={t('reactions.step2')} subtitle={t('reactions.windowHint')} />

        <View style={styles.lista}>
          {EXPOSURE_WINDOWS_HOURS.map((horas) => (
            <Chip
              key={horas}
              label={t('reactions.windowLabel', { hours: horas })}
              selected={ventana === horas}
              onPress={() => setVentana(horas)}
            />
          ))}
        </View>

        {!inicio ? (
          <Text variant="caption" color={colors.textSecondary}>
            {t('reactions.selectSymptomFirst')}
          </Text>
        ) : candidatos.candidates.length === 0 ? (
          <EmptyState
            title={t('reactions.noExposures')}
            description={t('reactions.noExposuresHint')}
          />
        ) : (
          <View style={styles.candidatos}>
            {candidatos.candidates.map(({ exposure, minutesBefore }) => {
              const elegida = exposicionesElegidas.includes(exposure.id);
              const nombre = exposure.food_id
                ? nameForId(exposure.food_id)
                : t(`exposureSource.${exposure.source_type}` as 'exposureSource.breastfeed');

              return (
                <Chip
                  key={exposure.id}
                  label={nombre || t('exposureSource.unknown')}
                  stateLabel={describeInterval(minutesBefore, {
                    hoursShort: t('common.hoursShort'),
                    minutesShort: t('common.minutesShort'),
                    before: t('reactions.beforeSymptom'),
                  })}
                  selected={elegida}
                  onPress={() =>
                    setExposicionesElegidas((actual) =>
                      actual.includes(exposure.id)
                        ? actual.filter((id) => id !== exposure.id)
                        : [...actual, exposure.id],
                    )
                  }
                />
              );
            })}
          </View>
        )}

        <Text variant="caption" color={colors.textSecondary}>
          {t('reactions.noCausality')}
        </Text>
      </Card>

      {/* Paso 3 · notas y fotos */}
      <Card>
        <SectionHeader title={t('reactions.step3')} />
        <Input
          label={t('common.notes')}
          value={notas}
          onChangeText={setNotas}
          multiline
          numberOfLines={3}
        />
        {params.symptomId ? (
          <>
            <Text variant="caption" color={colors.textSecondary}>
              {t('common.photos')}
            </Text>
            <MediaStrip entityType="symptom" entityId={params.symptomId} category="skin" />
          </>
        ) : null}
      </Card>

      {error ? (
        <Text variant="caption" color={colors.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Button
        label={t('reactions.save')}
        disabled={!puedeGuardar}
        loading={guardar.isPending}
        onPress={() => {
          if (!inicio || !baby) return;
          setError(null);
          guardar.mutate(
            {
              babyId: baby.id,
              startedAt: inicio,
              symptomIds: seleccionSintomas,
              notes: notas.trim() ? notas.trim() : undefined,
              links: exposicionesElegidas.map((exposureId) => ({ exposureId })),
            },
            {
              onSuccess: () => router.back(),
              onError: (causa) => setError(causa.message),
            },
          );
        }}
      />
      <Button variant="ghost" label={t('common.cancel')} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lista: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  candidatos: { gap: spacing.sm },
});
