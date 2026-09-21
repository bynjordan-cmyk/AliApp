import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip, Input, Text, colors, spacing } from '@/design-system';
import { formatDate, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

import {
  QUICK_OFFSETS_MINUTES,
  isFutureInstant,
  joinLocalInstant,
  splitLocalInstant,
} from './occurred-at';

export type OccurredAtFieldProps = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  /** Instante de referencia. Se pasa desde fuera: nadie lee el reloj al pintar. */
  now: Date;
};

/**
 * "¿Cuándo ocurrió?" pensado para una mano y poca batería mental.
 *
 * Lo normal se resuelve en un toque: ahora, hace 15 minutos, hace media hora.
 * Escribir una fecha existe, pero está detrás de "Otra hora", porque teclear
 * a las cuatro de la mañana es justo lo que no se quiere pedir.
 *
 * Nunca bloquea: si la fecha escrita no vale, lo dice y deja el valor anterior
 * intacto.
 */
export function OccurredAtField({ label, value, onChange, now }: OccurredAtFieldProps) {
  const { t, locale } = useI18n();
  const [manual, setManual] = useState(false);
  const inicial = splitLocalInstant(value);
  const [fecha, setFecha] = useState(inicial.date);
  const [hora, setHora] = useState(inicial.time);
  const [error, setError] = useState<string | null>(null);

  const aplicarManual = (proximaFecha: string, proximaHora: string) => {
    const instante = joinLocalInstant(proximaFecha, proximaHora);

    if (!instante) {
      setError(t('occurredAt.invalid'));
      return;
    }
    if (isFutureInstant(instante, now)) {
      setError(t('occurredAt.future'));
      return;
    }

    setError(null);
    onChange(instante);
  };

  const seleccionarDesplazamiento = (minutos: number) => {
    const instante = new Date(now.getTime() - minutos * 60_000).toISOString();
    const partes = splitLocalInstant(instante);
    setFecha(partes.date);
    setHora(partes.time);
    setError(null);
    onChange(instante);
  };

  return (
    <View style={styles.root}>
      <Text variant="caption">{label}</Text>

      <Text variant="bodyStrong">
        {formatDate(value, locale)} · {formatTime(value, locale)}
      </Text>

      <View style={styles.chips}>
        {QUICK_OFFSETS_MINUTES.map((minutos) => (
          <Chip
            key={minutos}
            label={etiquetaDesplazamiento(minutos, t)}
            onPress={() => seleccionarDesplazamiento(minutos)}
          />
        ))}
        <Chip
          label={t('occurredAt.other')}
          selected={manual}
          onPress={() => setManual((abierto) => !abierto)}
        />
      </View>

      {manual ? (
        <View style={styles.manual}>
          <Input
            label={t('occurredAt.date')}
            value={fecha}
            onChangeText={(texto) => {
              setFecha(texto);
              aplicarManual(texto, hora);
            }}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
          <Input
            label={t('occurredAt.time')}
            value={hora}
            onChangeText={(texto) => {
              setHora(texto);
              aplicarManual(fecha, texto);
            }}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      ) : null}

      {error ? (
        <Text variant="caption" color={colors.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function etiquetaDesplazamiento(
  minutos: number,
  t: (key: 'occurredAt.now' | 'occurredAt.minutesAgo' | 'occurredAt.hoursAgo', params?: Record<string, string | number>) => string,
): string {
  if (minutos === 0) return t('occurredAt.now');
  if (minutos < 60) return t('occurredAt.minutesAgo', { minutes: minutos });
  return t('occurredAt.hoursAgo', { hours: minutos / 60 });
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  manual: { gap: spacing.sm },
});
