import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  Chip,
  EmptyState,
  Input,
  QueryState,
  SectionHeader,
  Text,
  colors,
  radius,
  spacing,
  surfaces,
} from '@/design-system';
import { useSession } from '@/features/auth/SessionProvider';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { can } from '@/features/caregivers/permissions';
import { formatDate } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { FOOD_STATUSES, type AllergenBoardRow, type FoodStatus } from '@/types/domain';

import { useAllergenBoard, useFoods, useSetFoodStatus } from './useFoods';
import { useFoodNames } from './useFoodNames';

/**
 * Panel de alimentos (§13).
 *
 * Muestra hechos por alimento: estado actual, cuántas exposiciones hay, la
 * primera y la última. Sin rachas, sin premios por restricción y sin ninguna
 * puntuación de riesgo.
 *
 * Los estados que implican restricción los fija una persona, nunca el sistema.
 * Aquí es donde esa persona los fija: se toca un alimento y se elige su
 * estado. Y se puede traer cualquier alimento del catálogo, no solo los que ya
 * tienen historial — si no, marcar algo como Evitar por primera vez sería
 * imposible.
 *
 * Solo la madre, el padre o el responsable pueden cambiarlo, igual que en las
 * políticas de la base.
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
  const { membership } = useActiveBaby();
  const { profile } = useSession();
  const [filtro, setFiltro] = useState<FoodStatus | 'all'>('all');

  const puedeEditar = can(
    'foodStatus.write',
    membership ? { role: membership.role, status: membership.status } : null,
  );

  const guardar = useSetFoodStatus(babyId, profile?.id ?? null);

  const grupos = board.groups.filter(
    (grupo) => grupo.items.length > 0 && (filtro === 'all' || grupo.status === filtro),
  );

  return (
    <View style={styles.root}>
      {puedeEditar ? (
        <AnadirAlimento
          yaEnPanel={new Set(board.data?.map((fila) => fila.food_id ?? '') ?? [])}
          onElegir={(foodId, status) => guardar.mutate({ foodId, status })}
          guardando={guardar.isPending}
        />
      ) : null}

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
                  editable={puedeEditar}
                  guardando={guardar.isPending}
                  onCambiarEstado={(status) => {
                    if (item.food_id) guardar.mutate({ foodId: item.food_id, status });
                  }}
                />
              ))}
            </Card>
          ))
        )}
      </QueryState>
    </View>
  );
}

/**
 * Trae un alimento del catálogo al panel.
 *
 * Sin esto, el panel solo enseñaba lo que ya tenía historial o era alérgeno
 * mayor, y no había forma de marcar nada por primera vez.
 */
function AnadirAlimento({
  yaEnPanel,
  onElegir,
  guardando,
}: {
  yaEnPanel: Set<string>;
  onElegir: (foodId: string, status: FoodStatus) => void;
  guardando: boolean;
}) {
  const { t } = useI18n();
  const foods = useFoods();
  const [busqueda, setBusqueda] = useState('');
  const [elegido, setElegido] = useState<{ id: string; nombre: string } | null>(null);

  const termino = busqueda.trim().toLowerCase();

  const candidatos = (foods.data ?? [])
    .filter((food) => !yaEnPanel.has(food.id))
    .filter((food) => termino.length === 0 || food.displayName.toLowerCase().includes(termino))
    .slice(0, 8);

  return (
    <Card>
      <SectionHeader title={t('food.addToBoard')} subtitle={t('food.addToBoardHint')} />

      {elegido ? (
        <View style={styles.eleccion}>
          <Text variant="bodyStrong">{elegido.nombre}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {t('food.chooseStatus')}
          </Text>
          <View style={styles.filtros}>
            {FOOD_STATUSES.filter((status) => status !== 'unknown').map((status) => (
              <Chip
                key={status}
                label={t(`foodStatus.${status}` as const)}
                onPress={() => {
                  onElegir(elegido.id, status);
                  setElegido(null);
                  setBusqueda('');
                }}
              />
            ))}
          </View>
          <Chip label={t('common.cancel')} onPress={() => setElegido(null)} />
        </View>
      ) : (
        <View style={styles.eleccion}>
          <Input label={t('food.searchFood')} value={busqueda} onChangeText={setBusqueda} />
          <View style={styles.filtros}>
            {candidatos.map((food) => (
              <Chip
                key={food.id}
                label={food.displayName}
                stateLabel={food.is_major_allergen ? '★' : undefined}
                onPress={() => setElegido({ id: food.id, nombre: food.displayName })}
              />
            ))}
          </View>
          {candidatos.length === 0 ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('food.noFoodsLeft')}
            </Text>
          ) : null}
          {guardando ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('common.loading')}
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

function FilaAlimento({
  item,
  nombre,
  etiquetas,
  locale,
  editable,
  guardando,
  onCambiarEstado,
}: {
  item: AllergenBoardRow;
  nombre: string;
  etiquetas: { exposures: string; first: string; last: string; never: string; source: string };
  locale: 'es' | 'en';
  editable: boolean;
  guardando: boolean;
  onCambiarEstado: (status: FoodStatus) => void;
}) {
  const { t } = useI18n();
  const exposiciones = item.exposure_count ?? 0;
  const [abierto, setAbierto] = useState(false);

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

      {editable ? (
        <View style={styles.acciones}>
          <Chip
            label={abierto ? t('common.close') : t('food.changeStatus')}
            selected={abierto}
            onPress={() => setAbierto((valor) => !valor)}
          />
          {abierto ? (
            <View style={styles.filtros}>
              {FOOD_STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={t(`foodStatus.${status}` as const)}
                  selected={item.status === status}
                  onPress={() => {
                    onCambiarEstado(status);
                    setAbierto(false);
                  }}
                />
              ))}
            </View>
          ) : null}
          {guardando ? (
            <Text variant="caption" color={colors.textSecondary}>
              {t('common.loading')}
            </Text>
          ) : null}
        </View>
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
  acciones: { gap: spacing.sm, marginTop: spacing.xs },
  eleccion: { gap: spacing.sm },
  datos: { gap: spacing.xxs },
});
