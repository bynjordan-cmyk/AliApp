import { newId } from '@/lib/ids';
import { getSupabaseClient, getSupabaseEnv, type AliappClient } from '@/lib/supabase';
import type { MediaAsset, MediaCategory, MediaEntityType, MediaType } from '@/types/domain';
import { unwrap } from '@/services/errors';
import { buildSoftDeletePatch } from '@/services/soft-delete';

/**
 * Adjuntos privados (§17).
 *
 * El bucket es privado: no existe URL pública. El acceso es siempre por URL
 * firmada y de vida corta, y la ruta empieza por el household id para que la
 * política de Storage pueda comprobar la pertenencia.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 10;

export type UploadMediaInput = {
  householdId: string;
  entityType: MediaEntityType;
  entityId: string;
  mediaType: MediaType;
  category?: MediaCategory;
  capturedAt?: string;
  fileName: string;
  contentType: string;
  body: ArrayBuffer | Blob | Uint8Array;
};

/** Construye la ruta de almacenamiento. Siempre acotada al hogar. */
export function buildStoragePath(input: {
  householdId: string;
  entityType: MediaEntityType;
  entityId: string;
  fileName: string;
}): string {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${input.householdId}/${input.entityType}/${input.entityId}/${newId()}-${safeName}`;
}

export async function uploadMedia(
  input: UploadMediaInput,
  createdBy: string,
  client: AliappClient = getSupabaseClient(),
): Promise<MediaAsset> {
  const { mediaBucket } = getSupabaseEnv();
  const storagePath = buildStoragePath(input);

  const upload = await client.storage.from(mediaBucket).upload(storagePath, input.body, {
    contentType: input.contentType,
    upsert: false,
  });

  if (upload.error) {
    throw new Error(`[AliApp] uploadMedia: ${upload.error.message}`);
  }

  const [row] = unwrap(
    'uploadMedia.record',
    await client
      .from('media_assets')
      .insert({
        id: newId(),
        household_id: input.householdId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        storage_path: storagePath,
        media_type: input.mediaType,
        category: input.category ?? null,
        captured_at: input.capturedAt ?? null,
        created_by: createdBy,
      })
      .select('*'),
  );

  if (!row) throw new Error('[AliApp] uploadMedia: sin fila devuelta');
  return row;
}

/** URL firmada de vida corta. Nunca se expone una URL pública. */
export async function getSignedUrl(
  storagePath: string,
  client: AliappClient = getSupabaseClient(),
): Promise<string> {
  const { mediaBucket } = getSupabaseEnv();
  const { data, error } = await client.storage
    .from(mediaBucket)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    throw new Error(`[AliApp] getSignedUrl: ${error?.message ?? 'sin datos'}`);
  }

  return data.signedUrl;
}

export async function listMediaFor(
  entityType: MediaEntityType,
  entityId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<MediaAsset[]> {
  return unwrap(
    'listMediaFor',
    await client
      .from('media_assets')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  );
}

export async function softDeleteMedia(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('media_assets').update(buildSoftDeletePatch()).eq('id', id);
  if (error) throw new Error(`[AliApp] softDeleteMedia: ${error.message}`);
}
