import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text, colors, radius, spacing, surfaces } from '@/design-system';
import { MediaStrip } from '@/features/media/MediaStrip';
import { symptomTypeKey } from '@/features/timeline/timeline-labels';
import { formatDate, formatTime, minutesBetween } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { Symptom } from '@/types/domain';

/**
 * Tarjeta de síntoma: tipo, intensidad observada, hora, duración, notas y
 * fotos.
 *
 * Todo lo que muestra son datos que introdujo una persona. La intensidad es la
 * que anotó la familia, no una escala clínica, y la duración es aritmética
 * sobre las horas registradas.
 */
export function SymptomCard({
  symptom,
  onGroup,
}: {
  symptom: Symptom;
  onGroup?: (symptomId: string) => void;
}) {
  const { t, locale } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const tone = surfaces.symptom;

  const clave = symptomTypeKey(symptom.symptom_type);
  const duracion = symptom.ended_at ? minutesBetween(symptom.started_at, symptom.ended_at) : null;

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto((v) => !v)}
        style={styles.cabecera}
      >
        <View style={[styles.icono, { backgroundColor: tone.background }]}>
          <Ionicons name="eye-outline" size={18} color={tone.ink} accessible={false} />
        </View>

        <View style={styles.titulo}>
          <Text variant="bodyStrong">{clave ? t(clave) : symptom.symptom_type}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {formatDate(symptom.started_at, locale)} · {formatTime(symptom.started_at, locale)}
          </Text>
        </View>

        {symptom.severity ? (
          <View style={[styles.severidad, { backgroundColor: tone.background }]}>
            <Text variant="caption" color={tone.ink}>
              {t(`health.severity${symptom.severity}` as 'health.severity1')}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {abierto ? (
        <View style={styles.detalle}>
          {duracion !== null ? (
            <Fila etiqueta={t('health.duration')} valor={`${Math.floor(duracion / 60)} ${t('common.hoursShort')} ${duracion % 60} ${t('common.minutesShort')}`} />
          ) : (
            <Fila etiqueta={t('health.duration')} valor={t('health.stillOpen')} />
          )}

          {symptom.notes ? <Fila etiqueta={t('common.notes')} valor={symptom.notes} /> : null}

          <Text variant="caption" color={colors.textSecondary}>
            {t('common.photos')}
          </Text>
          <MediaStrip entityType="symptom" entityId={symptom.id} category="skin" />

          {onGroup ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onGroup(symptom.id)}
              style={styles.accion}
            >
              <Ionicons name="git-merge-outline" size={16} color={colors.brand} accessible={false} />
              <Text variant="caption" color={colors.brand}>
                {t('reactions.openBuilder')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text variant="caption" color={colors.textSecondary}>
        {etiqueta}
      </Text>
      <Text variant="caption">{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  icono: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { flex: 1, gap: spacing.xxs },
  severidad: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  detalle: { gap: spacing.sm, marginTop: spacing.sm },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  accion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
  },
});
