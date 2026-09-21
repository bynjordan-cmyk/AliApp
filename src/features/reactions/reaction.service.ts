import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { ReactionEpisodeInput } from '@/lib/validation';
import type {
  EpisodeExposureRelation,
  ExposureConfidenceLabel,
  ReactionEpisode,
} from '@/types/domain';
import { unwrap } from '@/services/errors';
import { buildSoftDeletePatch } from '@/services/soft-delete';

/**
 * Episodios de reacción.
 *
 * Un episodio AGRUPA síntomas ya registrados y puede asociarse a exposiciones.
 * La asociación es descriptiva: `relation_type` dice cómo llegó ahí (a mano o
 * como candidato temporal) y `confidence_label` describe la consistencia
 * temporal observada. Nada de esto es un diagnóstico ni una puntuación (§10).
 */

export async function createEpisode(
  input: ReactionEpisodeInput,
  context: { householdId: string; createdBy: string },
  client: AliappClient = getSupabaseClient(),
): Promise<ReactionEpisode> {
  const episodeId = newId();

  const [episode] = unwrap(
    'createEpisode',
    await client
      .from('reaction_episodes')
      .insert({
        id: episodeId,
        household_id: context.householdId,
        baby_id: input.babyId,
        started_at: input.startedAt,
        ended_at: input.endedAt ?? null,
        status: input.status,
        notes: input.notes ?? null,
        created_by: context.createdBy,
      })
      .select('*'),
  );

  if (!episode) throw new Error('[AliApp] createEpisode: sin fila devuelta');

  if (input.symptomIds.length > 0) {
    await addSymptomsToEpisode(episodeId, input.symptomIds, client);
  }

  return episode;
}

/** Un episodio puede agrupar tantos síntomas como haga falta. */
export async function addSymptomsToEpisode(
  episodeId: string,
  symptomIds: string[],
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  if (symptomIds.length === 0) return;

  const { error } = await client
    .from('episode_symptoms')
    .upsert(
      symptomIds.map((symptomId) => ({ episode_id: episodeId, symptom_id: symptomId })),
      { onConflict: 'episode_id,symptom_id' },
    );

  if (error) throw new Error(`[AliApp] addSymptomsToEpisode: ${error.message}`);
}

/**
 * Relaciona exposiciones con un episodio. Sin marca de causalidad: varias
 * exposiciones pueden convivir en el mismo episodio sin que ninguna quede
 * señalada como "la causa".
 */
export async function linkExposuresToEpisode(
  episodeId: string,
  links: {
    exposureId: string;
    relationType?: EpisodeExposureRelation;
    confidenceLabel?: ExposureConfidenceLabel;
  }[],
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  if (links.length === 0) return;

  const { error } = await client.from('episode_exposures').upsert(
    links.map((link) => ({
      episode_id: episodeId,
      exposure_id: link.exposureId,
      relation_type: link.relationType ?? 'manual',
      confidence_label: link.confidenceLabel ?? null,
    })),
    { onConflict: 'episode_id,exposure_id' },
  );

  if (error) throw new Error(`[AliApp] linkExposuresToEpisode: ${error.message}`);
}

export async function listEpisodes(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<ReactionEpisode[]> {
  return unwrap(
    'listEpisodes',
    await client
      .from('reaction_episodes')
      .select('*, episode_symptoms(symptom_id), episode_exposures(exposure_id, relation_type, confidence_label)')
      .eq('baby_id', babyId)
      .is('deleted_at', null)
      .order('started_at', { ascending: false }),
  );
}

export async function resolveEpisode(
  episodeId: string,
  endedAt: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client
    .from('reaction_episodes')
    .update({ status: 'resolved', ended_at: endedAt })
    .eq('id', episodeId);

  if (error) throw new Error(`[AliApp] resolveEpisode: ${error.message}`);
}

export async function softDeleteEpisode(
  episodeId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client
    .from('reaction_episodes')
    .update(buildSoftDeletePatch())
    .eq('id', episodeId);

  if (error) throw new Error(`[AliApp] softDeleteEpisode: ${error.message}`);
}
