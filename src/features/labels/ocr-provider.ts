import { fixtureLabelOcrProvider } from './providers/fixture';
import type { LabelOcrProvider } from './ocr-types';

/**
 * Proveedor de OCR por defecto.
 *
 * Este fichero es el que ve TypeScript y el que usan las pruebas. En una
 * aplicación de verdad nunca se carga: Metro resuelve antes
 * `ocr-provider.web.ts` en el navegador y `ocr-provider.native.ts` en iOS y
 * Android, que es como el resto de AliApp se mantiene ignorante del motor.
 */
export function getLabelOcrProvider(): LabelOcrProvider {
  return fixtureLabelOcrProvider;
}
