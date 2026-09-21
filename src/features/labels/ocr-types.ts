/**
 * Contrato de lectura de texto (OCR).
 *
 * UNA sola interfaz para las tres plataformas. Ni la pantalla ni el módulo de
 * ingredientes saben qué motor leyó la etiqueta: reciben texto normalizado y
 * siguen su camino. Cambiar de motor es escribir otro proveedor, no tocar la
 * interfaz.
 *
 * `engine` y `platform` viajan en el resultado por una razón de honestidad, no
 * de arquitectura: la pantalla debe poder decirle a una madre de dónde salió
 * el texto que está leyendo.
 */

/** Imagen de la que se va a leer. En web es un data URL; en nativo, un file://. */
export type LabelOcrImage = {
  uri: string;
  width?: number;
  height?: number;
};

/** Bloque de texto tal como lo agrupa el motor (un párrafo, un recuadro…). */
export type OcrBlock = {
  text: string;
  lines: string[];
};

export type OcrPlatform = 'web' | 'ios' | 'android' | 'test';

export type LabelOcrResult = {
  /** Texto completo, tal cual salió del motor. Se enseña siempre sin retocar. */
  rawText: string;
  /** Líneas en el orden en que se leyeron. */
  lines: string[];
  /** Agrupación del motor. Puede venir vacía: no todos los motores la dan. */
  blocks: OcrBlock[];
  /** Identificador del motor ('tesseract.js@7', 'mlkit', 'fixture'). */
  engine: string;
  platform: OcrPlatform;
};

/** Progreso de 0 a 1. Leer una etiqueta tarda, y hay que decirlo. */
export type LabelOcrProgress = (fraction: number) => void;

export type LabelOcrProvider = {
  readonly id: string;
  readonly engine: string;
  readonly platform: OcrPlatform;
  /**
   * ¿Se puede leer en este dispositivo?
   *
   * En nativo depende de que el módulo esté en la build; en web, de que el
   * navegador aguante WebAssembly. Nunca se asume que sí.
   */
  isAvailable(): Promise<boolean>;
  recognize(image: LabelOcrImage, onProgress?: LabelOcrProgress): Promise<LabelOcrResult>;
  /** Libera lo que el motor tenga cargado. Opcional. */
  dispose?(): Promise<void>;
};

/** El motor no pudo leer, o no está disponible. La pantalla lo cuenta en claro. */
export class LabelOcrUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`[AliApp] OCR no disponible: ${reason}`);
    this.name = 'LabelOcrUnavailableError';
  }
}
