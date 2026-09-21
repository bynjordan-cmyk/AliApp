import { Image, StyleSheet, View } from 'react-native';

import { Card, EmptyState, Text, colors, radius, spacing } from '@/design-system';
import { formatDate, formatTime, minutesBetween } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import type { MediaEntityType } from '@/types/domain';

import { useMedia } from './useMedia';

/**
 * Evolución visual: las fotos de un registro en orden cronológico.
 *
 * Junto a cada foto se muestra su hora y el tiempo transcurrido desde la
 * primera. Eso es un hecho medible. Lo que la foto muestre —si mejora, si
 * empeora, a qué se parece— lo valora una persona, nunca AliApp.
 */
export function MediaEvolution({
  entityType,
  entityId,
}: {
  entityType: MediaEntityType;
  entityId: string;
}) {
  const { t, locale } = useI18n();
  const { data } = useMedia(entityType, entityId);

  const fotos = [...(data ?? [])].sort(
    (a, b) =>
      new Date(a.captured_at ?? a.created_at).getTime() -
      new Date(b.captured_at ?? b.created_at).getTime(),
  );

  if (fotos.length === 0) {
    return <EmptyState title={t('common.noPhotos')} description={t('media.empty')} />;
  }

  const primera = fotos[0];
  const inicio = primera ? (primera.captured_at ?? primera.created_at) : null;

  return (
    <Card>
      <Text variant="subtitle">{t('media.title')}</Text>

      <View style={styles.lista}>
        {fotos.map((foto) => {
          const momento = foto.captured_at ?? foto.created_at;
          const transcurrido = inicio ? minutesBetween(inicio, momento) : 0;

          return (
            <View key={foto.id} style={styles.fila}>
              {foto.signedUrl ? (
                <Image
                  source={{ uri: foto.signedUrl }}
                  style={styles.imagen}
                  accessibilityLabel={`${t('common.photos')} ${formatTime(momento, locale)}`}
                />
              ) : (
                <View style={[styles.imagen, styles.vacia]} />
              )}

              <View style={styles.texto}>
                <Text variant="bodyStrong">{formatTime(momento, locale)}</Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {formatDate(momento, locale)}
                </Text>
                {transcurrido > 0 ? (
                  <Text variant="caption" color={colors.textSecondary}>
                    +{Math.floor(transcurrido / 60)} h {transcurrido % 60} min
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      <Text variant="caption" color={colors.textSecondary}>
        {t('media.documentation')}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.md },
  fila: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  imagen: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  vacia: { borderWidth: 1, borderColor: colors.border },
  texto: { flex: 1, gap: spacing.xxs },
});
