import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  Chip,
  EmptyState,
  QueryState,
  Text,
  colors,
  radius,
  spacing,
  surfaces,
} from '@/design-system';
import { formatDate } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { FOOD_STATUSES, type AllergenBoardRow, type FoodStatus } from '@/types/domain';

import { useAllergenBoard } from './useFoods';
import { useFoodNames } from './useFoodNames';

/**
 * Panel de alimentos (§13).
 *
 * Muestra hechos por alimento: estado actual, cuántas exposiciones hay, la
 * primera y la última. Sin rachas, sin premios por restricción y sin ninguna
 * puntuación de riesgo.
 *
 * Los estados que implican restricción los fija una persona, nunca el sistema:
 * aquí solo se leen.
 */

const ICONO_POR_ESTADO: Record<FoodStatus, React.ComponentProps<typeof Ionicons>['name']> = {
  unknown: 'ellipse-outline',
  introducing: 'leaf-outline',
  observing: 'eye-outline',
  tolerated: 'checkmark-circle-outline',
  avoid: 'hand-left-outline',
  professional_supervision: 'medkit-outline',
};

function toneOf(status: FoodStatus) {
  switch (status) {
    case 'tolerated':
      return surfaces.diaper;
    case 'avoid':
    case 'professional_supervision':
      return surfaces.feeding;
    case 'observing':
    case 'introducing':
      return surfaces.symptom;
    default:
      return surfaces.neutral;
  }
}

export function AllergenBoard({ babyId }: { babyId: string }) {
  const { t, locale } = useI18n();
  const board = useAllergenBoard(babyId);
  const { byId } = useFoodNames();
  const [filtro, setFiltro] = useState<FoodStatus | 'all'>('all');

  const grupos = board.groups.filter(
    (grupo) => grupo.items.length > 0 && (filtro === 'all' || grupo.status === filtro),
  );

  return (
    <View style={styles.root}>
      <View style={styles.filtros}>
        <Chip label={t('common.all')} selected={filtro === 'all'} onPress={() => setFiltro('all')} />
        {FOOD_STATUSES.map((status) => (
          <Chip
            key={status}
            label={t(`foodStatus.${status}` as const)}
            selected={filtro === status}
            onPress={() => setFiltro(status)}
          />
        ))}
      </View>

      <QueryState
        loading={board.isLoading}
        error={board.isError}
        onRetry={() => {
          void board.refetch();
        }}
      >
        {grupos.length === 0 ? (
          <EmptyState title={t('food.boardEmpty')} description={t('food.boardEmptyHint')} />
        ) : (
          grupos.map((grupo) => (
            <Card key={grupo.status}>
              <View style={styles.cabecera}>
                <View style={[styles.icono, { backgroundColor: toneOf(grupo.status).background }]}>
                  <Ionicons
                    name={ICONO_POR_ESTADO[grupo.status]}
                    size={18}
                    color={toneOf(grupo.status).ink}
                    accessible={false}
                  />
                </View>
                <Text variant="subtitle">{t(`foodStatus.${grupo.status}` as const)}</Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {grupo.items.length}
                </Text>
              </View>

              {grupo.items.map((item) => (
                <FilaAlimento
                  key={`${grupo.status}-${item.food_id}`}
                  item={item}
                  nombre={
                    byId.get(item.food_id ?? '') ?? item.canonical_name ?? item.canonical_key ?? ''
                  }
                  etiquetas={{
                    exposures: t('foodStatus.exposures'),
                    first: t('foodStatus.firstExposure'),
                    last: t('foodStatus.lastExposure'),
                    never: t('food.neverIntroduced'),
                    source: t('food.statusSetBy'),
                  }}
                  locale={locale}
                />
              ))}
            </Card>
          ))
        )}
      </QueryState>
    </View>
  );
}

function FilaAlimento({
  item,
  nombre,
  etiquetas,
  locale,
}: {
  item: AllergenBoardRow;
  nombre: string;
  etiquetas: { exposures: string; first: string; last: string; never: string; source: string };
  locale: 'es' | 'en';
}) {
  const exposiciones = item.exposure_count ?? 0;

  return (
    <View style={styles.fila}>
      <Text variant="bodyStrong">{nombre}</Text>

      {exposiciones === 0 ? (
        <Text variant="caption" color={colors.textSecondary}>
          {etiquetas.never}
        </Text>
      ) : (
        <View style={styles.datos}>
          <Text variant="caption" color={colors.textSecondary}>
            {etiquetas.exposures}: {exposiciones}
          </Text>
          {item.first_exposure_at ? (
            <Text variant="caption" color={colors.textSecondary}>
              {etiquetas.first}: {formatDate(item.first_exposure_at, locale)}
            </Text>
          ) : null}
          {item.last_exposure_at ? (
            <Text variant="caption" color={colors.textSecondary}>
              {etiquetas.last}: {formatDate(item.last_exposure_at, locale)}
            </Text>
          ) : null}
        </View>
      )}

      {item.status_source && item.status !== 'unknown' ? (
        <Text variant="overline" color={colors.textSecondary}>
          {etiquetas.source}: {item.status_source}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icono: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fila: { gap: spacing.xxs, paddingVertical: spacing.sm },
  datos: { gap: spacing.xxs },
});
