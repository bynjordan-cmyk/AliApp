import { createWorker, type Worker } from 'tesseract.js';

import { normalizeOcrPayload, type RawOcrPayload } from '../ocr-normalize';
import {
  LabelOcrUnavailableError,
  type LabelOcrImage,
  type LabelOcrProgress,
  type LabelOcrProvider,
  type LabelOcrResult,
} from '../ocr-types';

/**
 * OCR real en el navegador, con tesseract.js sobre WebAssembly.
 *
 * DECISIÓN DE PRIVACIDAD, y es la razón de elegir este camino: la foto NO sale
 * del dispositivo. No se sube a ningún servicio de reconocimiento; el motor se
 * ejecuta en la propia pestaña y la imagen muere ahí. Lo único que viaja por
 * la red es el motor en sí —el WebAssembly y los datos de idioma—, que además
 * quedan en caché del navegador después de la primera lectura.
 *
 * Los idiomas son español e inglés: las etiquetas de un supermercado español
 * mezclan los dos con alegría.
 */

const ENGINE = 'tesseract.js@7';
const LANGS = ['spa', 'eng'];

/**
 * De dónde se carga el motor.
 *
 * Por defecto, del PROPIO dominio de AliApp (`/ocr`, servido desde `public/`).
 * La lectura de etiquetas no hace así ni una sola petición a terceros: ni la
 * foto ni el hecho de que alguien esté leyendo una etiqueta salen de aquí.
 *
 * `EXPO_PUBLIC_OCR_ASSET_BASE=cdn` vuelve al CDN público de tesseract.js, y
 * cualquier otro valor apunta a otra ruta. Ver `docs/label-scan.md`.
 *
 * En todos los casos la FOTO se queda en el dispositivo: lo que viaja —si
 * viaja— es el motor, nunca la imagen.
 */
const DEFAULT_ASSET_BASE = '/ocr';
const CDN = 'cdn';

const configurado = process.env.EXPO_PUBLIC_OCR_ASSET_BASE;
const ASSET_BASE = configurado === CDN ? null : (configurado ?? DEFAULT_ASSET_BASE);

function assetPaths() {
  // null = que tesseract.js use sus rutas públicas por defecto.
  if (!ASSET_BASE) return {};

  const base = ASSET_BASE.replace(/\/$/, '');
  return {
    workerPath: `${base}/worker.min.js`,
    corePath: `${base}/core`,
    langPath: `${base}/lang`,
  };
}

/**
 * El worker es caro de arrancar (descarga el motor y los idiomas), así que se
 * reutiliza entre lecturas. La segunda etiqueta se lee en un par de segundos.
 */
let workerPromise: Promise<Worker> | null = null;

async function getWorker(onProgress?: LabelOcrProgress): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(LANGS, 1, {
      ...assetPaths(),
      // Los datos de idioma se publican sin comprimir: ver
      // `scripts/prepare-ocr-assets.mjs`. Con `.gz`, un CDN que añada
      // `Content-Encoding: gzip` haría que el navegador los descomprimiera y
      // tesseract recibiría bytes crudos donde espera un gzip.
      gzip: ASSET_BASE !== null ? false : undefined,
      logger: (mensaje: { status: string; progress: number }) => {
        // La descarga del motor es la mitad de la espera de la primera vez.
        if (mensaje.status === 'recognizing text') return;
        onProgress?.(Math.min(0.5, mensaje.progress * 0.5));
      },
    }).catch((cause: unknown) => {
      // Un fallo al cargar no debe dejar el worker envenenado para siempre.
      workerPromise = null;
      throw cause;
    });
  }

  return workerPromise;
}

function browserSupportsWasm(): boolean {
  return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
}

export const webLabelOcrProvider: LabelOcrProvider = {
  id: 'web-tesseract',
  engine: ENGINE,
  platform: 'web',

  async isAvailable() {
    return browserSupportsWasm();
  },

  async recognize(image: LabelOcrImage, onProgress?: LabelOcrProgress): Promise<LabelOcrResult> {
    if (!browserSupportsWasm()) {
      throw new LabelOcrUnavailableError('el navegador no admite WebAssembly');
    }

    const worker = await getWorker(onProgress);

    const { data } = await worker.recognize(
      image.uri,
      {},
      // Se piden los bloques además del texto: dan las líneas en su orden real,
      // que es mucho mejor materia prima para trocear ingredientes.
      { text: true, blocks: true },
    );

    onProgress?.(1);

    return normalizeOcrPayload(data as unknown as RawOcrPayload, {
      engine: ENGINE,
      platform: 'web',
    });
  },

  async dispose() {
    const actual = workerPromise;
    workerPromise = null;
    if (actual) {
      const worker = await actual.catch(() => null);
      await worker?.terminate();
    }
  },
};
