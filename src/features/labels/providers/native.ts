import { NativeModules, Platform } from 'react-native';

import { normalizeOcrPayload, type RawOcrPayload } from '../ocr-normalize';
import {
  LabelOcrUnavailableError,
  type LabelOcrImage,
  type LabelOcrProgress,
  type LabelOcrProvider,
  type LabelOcrResult,
  type OcrPlatform,
} from '../ocr-types';

/**
 * OCR en el dispositivo con ML Kit (iOS y Android).
 *
 * Misma promesa de privacidad que en web: ML Kit reconoce el texto EN EL
 * TELÉFONO. La foto no se sube a ningún servicio de reconocimiento.
 *
 * El módulo se carga de forma perezosa y a prueba de fallos, por una razón muy
 * concreta: es código nativo, así que solo existe en una build que lo haya
 * compilado. En Expo Go, en la web o en una build antigua no está — y en ese
 * caso AliApp lo dice en pantalla en lugar de reventar. Una madre no tiene por
 * qué enterarse de nuestras decisiones de empaquetado a base de pantallazos en
 * rojo.
 */

const ENGINE = 'mlkit';

type MlKitModule = {
  default: {
    recognize(imageUri: string, script?: string): Promise<RawOcrPayload>;
  };
};

function currentPlatform(): OcrPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/** ¿Está el módulo nativo compilado en esta build? Sin proxies ni sorpresas. */
function isLinked(): boolean {
  return Boolean(NativeModules.TextRecognition);
}

async function loadModule(): Promise<MlKitModule['default']> {
  if (!isLinked()) {
    throw new LabelOcrUnavailableError(
      'el módulo de reconocimiento no está en esta build de la aplicación',
    );
  }

  try {
    const modulo = (await import(
      '@react-native-ml-kit/text-recognition'
    )) as unknown as MlKitModule;
    return modulo.default;
  } catch (cause) {
    throw new LabelOcrUnavailableError((cause as Error).message);
  }
}

export const nativeLabelOcrProvider: LabelOcrProvider = {
  id: 'native-mlkit',
  engine: ENGINE,
  platform: currentPlatform(),

  async isAvailable() {
    return isLinked();
  },

  async recognize(image: LabelOcrImage, onProgress?: LabelOcrProgress): Promise<LabelOcrResult> {
    const reconocedor = await loadModule();

    // ML Kit no informa de progreso: es una llamada y una respuesta. Se marca
    // el arranque para que la pantalla no parezca congelada.
    onProgress?.(0.3);

    const payload = await reconocedor.recognize(image.uri);

    onProgress?.(1);

    return normalizeOcrPayload(payload, {
      engine: ENGINE,
      platform: currentPlatform(),
    });
  },
};
