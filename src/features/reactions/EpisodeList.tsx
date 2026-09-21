import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, EmptyState, QueryState, Text, colors, radius, spacing, surfaces } from '@/design-system';
import { MediaEvolution } from '@/features/media/MediaEvolution';
import { formatDate, formatTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';

import { useEpisodes } from './useEpisodes';

/**
 * Episodios de reacción, con su evolución visual.
 *
 * Un episodio agrupa síntomas y puede tener exposiciones asociadas. La lista
 * muestra cuántas hay, nunca cuál "fue la causa".
 */
export function EpisodeList({ babyId }: { babyId: string }) {
  const { t, locale } = useI18n();
  const episodes = useEpisodes(babyId);
  const [abierto, setAbierto] = useState<string | null>(null);

  return (
    <QueryState
      loading={episodes.isLoading}
      error={episodes.isError}
      onRetry={() => {
        void episodes.refetch();
      }}
    >
      {(episodes.data ?? []).length === 0 ? (
        <EmptyState title={t('health.noEpisodes')} description={t('health.noEpisodesHint')} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {(episodes.data ?? []).map((episode) => {
            const expandido = abierto === episode.id;
            const tone = surfaces.episode;
            const relacionado = episode as unknown as {
              episode_symptoms?: unknown[];
              episode_exposures?: unknown[];
            };

            return (
              <Card key={episode.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: expandido }}
                  onPress={() => setAbierto(expandido ? null : episode.id)}
                  style={styles.cabecera}
                >
                  <View style={[styles.icono, { backgroundColor: tone.background }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={tone.ink} accessible={false} />
                  </View>

                  <View style={styles.titulo}>
                    <Text variant="bodyStrong">
                      {episode.status === 'open'
                        ? t('health.episodeOpen')
                        : t('health.episodeResolved')}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      {formatDate(episode.started_at, locale)} ·{' '}
                      {formatTime(episode.started_at, locale)}
                    </Text>
                  </View>

                  <Text variant="caption" color={colors.textSecondary}>
                    {t('health.symptoms')}: {relacionado.episode_symptoms?.length ?? 0}
                  </Text>
                </Pressable>

                {expandido ? (
                  <View style={styles.detalle}>
                    <View style={styles.fila}>
                      <Text variant="caption" color={colors.textSecondary}>
                        {t('reactions.linkedExposures')}
                      </Text>
                      <Text variant="caption">{relacionado.episode_exposures?.length ?? 0}</Text>
                    </View>

                    {episode.notes ? <Text variant="caption">{episode.notes}</Text> : null}

                    <MediaEvolution entityType="reaction_episode" entityId={episode.id} />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </QueryState>
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
  detalle: { gap: spacing.sm, marginTop: spacing.sm },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
});
