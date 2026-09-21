import { normalizeOcrPayload } from '../ocr-normalize';
import type { LabelOcrProvider, LabelOcrResult } from '../ocr-types';

/**
 * Etiqueta de laboratorio.
 *
 * Esto NO es el motor de la aplicación: es un fixture. Existe para que las
 * pruebas de normalización, extracción de ingredientes y comparación con el
 * panel de alimentos puedan correr sin navegador y sin cámara.
 *
 * En web y en nativo manda el motor real. Si alguna vez esta lectura apareciera
 * en un dispositivo de una familia, la pantalla lo diría con todas las letras
 * (`label.fixtureNotice`), porque confundir una demostración con la lectura de
 * tu propia foto sería justo el tipo de error que AliApp no se puede permitir.
 */

export const LABEL_FIXTURE_TEXT = [
  'INGREDIENTES: harina de trigo, aceite de girasol,',
  'leche en polvo desnatada (caseinato), azúcar,',
  'lecitina de soja, sal, aroma de vainilla.',
  'Puede contener trazas de frutos secos.',
].join('\n');

export const fixtureLabelOcrProvider: LabelOcrProvider = {
  id: 'fixture',
  engine: 'fixture',
  platform: 'test',

  async isAvailable() {
    return true;
  },

  async recognize(): Promise<LabelOcrResult> {
    return normalizeOcrPayload(
      { text: LABEL_FIXTURE_TEXT },
      { engine: 'fixture', platform: 'test' },
    );
  },
};
