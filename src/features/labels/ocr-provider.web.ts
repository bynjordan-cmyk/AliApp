import { webLabelOcrProvider } from './providers/web';
import type { LabelOcrProvider } from './ocr-types';

/** En el navegador manda tesseract.js sobre WebAssembly, con la foto en local. */
export function getLabelOcrProvider(): LabelOcrProvider {
  return webLabelOcrProvider;
}
