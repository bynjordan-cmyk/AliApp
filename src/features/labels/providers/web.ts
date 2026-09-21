import { createWorker, type Worker } from 'tesseract.js';

import { LabelScanError, classifyOcrError } from '../ocr-errors';
import { normalizeOcrPayload, type RawOcrPayload } from '../ocr-normalize';
import {
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
      // Los datos de idioma se guardan en IndexedDB tras la primera lectura.
      // Es lo que hace que el segundo escaneo sea visiblemente más rápido,
      // incluso después de recargar la página.
      cacheMethod: 'write',
      logger: (mensaje: { status: string; progress: number }) => {
        // La descarga del motor es la mitad de la espera de la primera vez.
        if (mensaje.status === 'recognizing text') return;
        onProgress?.(Math.min(0.5, mensaje.progress * 0.5));
      },
    })
      .then(async (worker) => {
        // Una lista de ingredientes es UN bloque de texto corrido, no una
        // página con columnas. Con el modo automático, tesseract intenta
        // analizar la maquetación del envase entero —logotipos, tabla
        // nutricional, códigos— y devuelve una sopa. El modo de bloque único
        // se centra en leer.
        await worker.setParameters({
          tessedit_pageseg_mode: '6' as never,
          // Sin esto, tesseract adivina los puntos por pulgada de una foto que
          // no los trae, y avisa por consola en cada lectura.
          user_defined_dpi: '300',
        });
        return worker;
      })
      .catch((cause: unknown) => {
      // Un fallo al cargar no debe dejar el worker envenenado para siempre:
      // se olvida para que el siguiente intento vuelva a probar de cero.
      workerPromise = null;
      throw new LabelScanError('engine_load_failed', (cause as Error)?.message);
    });
  }

  return workerPromise;
}

/**
 * Por debajo de esto, la lectura no se enseña.
 *
 * Medido: 95 en etiqueta limpia y en etiqueta degradada pero legible, 37 en
 * la foto de una pantalla. 60 queda en mitad del hueco.
 */
const CONFIANZA_MINIMA = 60;

function browserSupportsWasm(): boolean {
  return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
}

/**
 * La foto va al motor TAL CUAL.
 *
 * Hubo aquí un paso de preparación —reducir, pasar a gris y estirar el
 * contraste entre los percentiles 2 y 98— que parecía sensato y medía fatal.
 * Sobre una etiqueta con ruido, el recorte del 2 % caía en gris 123, muy por
 * encima del texto, así que el estirado multiplicaba por 2,6 el ruido del
 * fondo y lo convertía en manchas que el motor leía como letras: de doce
 * palabras esperadas salían cinco, y el resto era sopa.
 *
 * `npm run test:ocr:web` incluye esa etiqueta con ruido justo para que esto no
 * vuelva a colarse. Si alguna vez se añade preparación, que sea porque esa
 * comprobación mejora, no porque suene razonable.
 */

export const webLabelOcrProvider: LabelOcrProvider = {
  id: 'web-tesseract',
  engine: ENGINE,
  platform: 'web',

  async isAvailable() {
    return browserSupportsWasm();
  },

  async recognize(image: LabelOcrImage, onProgress?: LabelOcrProgress): Promise<LabelOcrResult> {
    if (!browserSupportsWasm()) {
      throw new LabelScanError('engine_load_failed', 'el navegador no admite WebAssembly');
    }

    const worker = await getWorker(onProgress);

    let data;
    try {
      ({ data } = await worker.recognize(
        image.uri,
        {},
        // Se piden los bloques además del texto: dan las líneas en su orden
        // real, mucho mejor materia prima para trocear ingredientes.
        { text: true, blocks: true },
      ));
    } catch (cause) {
      // El worker se ha roto leyendo. Se descarta para que el reintento
      // arranque uno limpio en lugar de insistir con uno muerto.
      workerPromise = null;
      throw new LabelScanError(classifyOcrError(cause), (cause as Error)?.message);
    }

    // Puerta de confianza.
    //
    // El motor devuelve una confianza media por lectura, y separa los dos
    // casos con holgura: 95 sobre una etiqueta limpia, 95 sobre una etiqueta
    // con degradado, ruido, inclinación y JPEG malo que aun así se lee
    // entera, y 37 sobre la foto de una pantalla con una tabla nutricional,
    // que devolvía páginas de símbolos. El corte va en medio de ese hueco.
    //
    // Importa más de lo que parece: sin esto, la pantalla enseñaba la sopa
    // como «texto detectado», que es justo lo que invita a darla por buena.
    const confianza = (data as { confidence?: number }).confidence;
    if (typeof confianza === 'number' && confianza < CONFIANZA_MINIMA) {
      throw new LabelScanError('low_confidence', `confianza ${Math.round(confianza)}`);
    }

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
