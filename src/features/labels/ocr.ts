/**
 * Puerta de entrada al OCR.
 *
 * Todo el producto importa de aquí y solo de aquí. Qué motor hay detrás lo
 * decide `ocr-provider`, que Metro resuelve por plataforma.
 */
export { getLabelOcrProvider } from './ocr-provider';
export { hasUsableText, normalizeOcrPayload } from './ocr-normalize';
export * from './ocr-types';
