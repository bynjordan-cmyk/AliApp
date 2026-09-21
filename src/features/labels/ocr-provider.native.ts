import { nativeLabelOcrProvider } from './providers/native';
import type { LabelOcrProvider } from './ocr-types';

/** En iOS y Android manda ML Kit, reconociendo el texto en el propio teléfono. */
export function getLabelOcrProvider(): LabelOcrProvider {
  return nativeLabelOcrProvider;
}
