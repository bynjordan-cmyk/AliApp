import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Text,
  colors,
  radius,
  spacing,
  surfaces,
  touchTarget,
  type SurfaceTone,
} from '@/design-system';
import { MediaStrip } from '@/features/media/MediaStrip';
import { useFoodNames } from '@/features/food/useFoodNames';
import { formatDayHeading, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { TimelineDay, TimelineItem, TimelineItemType } from '@/types/timeline';

import { timelineDetails, timelineSubtitle } from './timeline-labels';

/**
 * Línea de tiempo como relato visual: un rail vertical con un nodo por evento.
 *
 * Cada evento se puede desplegar para ver su detalle y sus fotos sin salir de
 * la pantalla. El color acompaña al icono y al texto; nunca va solo (§21).
 */

const TONE_BY_TYPE: Record<TimelineItemType, SurfaceTone> = {
  food_entry: 'feeding',
  breastfeed: 'breastfeed',
  diaper_event: 'diaper',
  symptom: 'symptom',
  reaction_episode: 'episode',
  medication_event: 'medication',
};

const ICON_BY_TYPE: Record<TimelineItemType, React.ComponentProps<typeof Ionicons>['name']> = {
  food_entry: 'restaurant-outline',
  breastfeed: 'water-outline',
  diaper_event: 'happy-outline',
  symptom: 'eye-outline',
  reaction_episode: 'alert-circle-outline',
  medication_event: 'medkit-outline',
};

/** Entidades a las que se pueden adjuntar fotos, por tipo de evento. */
const MEDIA_ENTITY_BY_TYPE: Partial<Record<TimelineItemType, 'symptom' | 'reaction_episode' | 'diaper_event' | 'food_entry'>> = {
  symptom: 'symptom',
  reaction_episode: 'reaction_episode',
  diaper_event: 'diaper_event',
  food_entry: 'food_entry',
};

export function TimelineRail({
  days,
  expandable = true,
}: {
  days: TimelineDay[];
  expandable?: boolean;
}) {
  const { locale, t } = useI18n();
  const { nameForKey } = useFoodNames();
  const router = useRouter();
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      {days.map((day) => (
        <View key={day.dayKey} style={styles.day}>
          <Text variant="overline" color={colors.textSecondary}>
            {formatDayHeading(day.items[0]?.occurredAt ?? day.dayKey, locale).toUpperCase()}
          </Text>

          {day.items.map((item, index) => (
            <TimelineNode
              key={`${item.type}-${item.id}`}
              item={item}
              hora={formatTime(item.occurredAt, locale)}
              titulo={t(item.title)}
              subtitulo={timelineSubtitle(item, t, nameForKey) ?? undefined}
              detalles={timelineDetails(item, t, nameForKey)}
              ultimo={index === day.items.length - 1}
              expandido={abierto === `${item.type}-${item.id}`}
              onOpen={() => router.push(`/record/${item.type}/${item.id}`)}
              onToggle={
                expandable
                  ? () =>
                      setAbierto((actual) =>
                        actual === `${item.type}-${item.id}` ? null : `${item.type}-${item.id}`,
                      )
                  : undefined
              }
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function TimelineNode({
  item,
  hora,
  titulo,
  subtitulo,
  detalles,
  ultimo,
  expandido,
  onToggle,
  onOpen,
}: {
  item: TimelineItem;
  hora: string;
  titulo: string;
  subtitulo?: string;
  detalles: { label: string; value: string }[];
  ultimo: boolean;
  expandido: boolean;
  onToggle?: () => void;
  onOpen?: () => void;
}) {
  const { t } = useI18n();
  const tone = surfaces[TONE_BY_TYPE[item.type]];
  const entidad = MEDIA_ENTITY_BY_TYPE[item.type];
  // Sello discreto de transparencia: alguien anotó mejor lo que pasó.
  const editado = typeof item.metadata.editedAt === 'string';

  const contenido = (
    <View style={styles.row}>
      <View style={styles.railColumn}>
        <View style={[styles.node, { backgroundColor: tone.background, borderColor: tone.accent }]}>
          <Ionicons name={ICON_BY_TYPE[item.type]} size={16} color={tone.ink} accessible={false} />
        </View>
        {!ultimo ? <View style={styles.rail} /> : null}
      </View>

      <View style={styles.body}>
        <View style={styles.header}>
          <Text variant="bodyStrong">{titulo}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {hora}
          </Text>
        </View>

        {subtitulo ? (
          <Text variant="caption" color={colors.textSecondary}>
            {subtitulo}
          </Text>
        ) : null}

        {editado ? (
          <Text variant="caption" color={colors.textSecondary}>
            {t('record.edited')}
          </Text>
        ) : null}

        {expandido ? (
          <View style={styles.detalle}>
            {detalles.map((detalle) => (
              <View key={detalle.label} style={styles.detalleFila}>
                <Text variant="caption" color={colors.textSecondary}>
                  {detalle.label}
                </Text>
                <Text variant="caption">{detalle.value}</Text>
              </View>
            ))}

            {entidad ? <MediaStrip entityType={entidad} entityId={item.id} /> : null}

            {/* Corregir algo no debe obligar a ir a otra sección (§5). */}
            {onOpen ? (
              <Button variant="secondary" label={t('common.edit')} onPress={onOpen} />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  if (!onToggle) return contenido;

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: expandido }}
      accessibilityLabel={[titulo, hora, subtitulo].filter(Boolean).join(', ')}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xl },
  day: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md, minHeight: touchTarget.min },
  railColumn: { alignItems: 'center', width: 32 },
  node: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: spacing.xxs },
  body: { flex: 1, paddingBottom: spacing.lg, gap: spacing.xxs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  detalle: { marginTop: spacing.sm, gap: spacing.xs },
  detalleFila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  pressed: { opacity: 0.7 },
});
