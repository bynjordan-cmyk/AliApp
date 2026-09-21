import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { uploadMedia } from '@/services/media.service';
import type { MediaCategory, MediaEntityType } from '@/types/domain';

/**
 * Captura y subida de fotos.
 *
 * Reglas de §17: se comprime en el dispositivo, se guarda en bucket privado y
 * la ruta queda acotada al hogar. Los permisos se piden AQUÍ, cuando la
 * persona decide adjuntar una foto, no al abrir la aplicación.
 */

const ANCHO_MAXIMO = 1600;
const CALIDAD = 0.7;

export type CaptureSource = 'camera' | 'library';

export type CaptureTarget = {
  householdId: string;
  entityType: MediaEntityType;
  entityId: string;
  category?: MediaCategory;
  capturedAt?: string;
};

export class PermissionDeniedError extends Error {
  constructor(readonly source: CaptureSource) {
    super(`[AliApp] permiso de ${source} denegado`);
    this.name = 'PermissionDeniedError';
  }
}

async function pedirPermiso(source: CaptureSource): Promise<void> {
  const resultado =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!resultado.granted) {
    throw new PermissionDeniedError(source);
  }
}

/** Reduce la foto antes de subirla: menos datos de la familia viajando. */
export async function comprimir(uri: string): Promise<{ uri: string }> {
  const contexto = ImageManipulator.ImageManipulator.manipulate(uri);
  contexto.resize({ width: ANCHO_MAXIMO });
  const imagen = await contexto.renderAsync();
  return imagen.saveAsync({ compress: CALIDAD, format: ImageManipulator.SaveFormat.JPEG });
}

export async function capturarYSubir(
  source: CaptureSource,
  target: CaptureTarget,
  createdBy: string,
): Promise<string | null> {
  await pedirPermiso(source);

  const seleccion =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 1, exif: false })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 1,
          exif: false,
          mediaTypes: ['images'],
        });

  if (seleccion.canceled) return null;

  const activo = seleccion.assets[0];
  if (!activo) return null;

  const comprimida = await comprimir(activo.uri);
  const respuesta = await fetch(comprimida.uri);
  const blob = await respuesta.blob();

  const asset = await uploadMedia(
    {
      householdId: target.householdId,
      entityType: target.entityType,
      entityId: target.entityId,
      mediaType: 'photo',
      category: target.category,
      capturedAt: target.capturedAt ?? new Date().toISOString(),
      fileName: `foto-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
      body: blob,
    },
    createdBy,
  );

  return asset.id;
}
