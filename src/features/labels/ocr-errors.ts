import type { TranslationKey } from '@/lib/i18n';

/**
 * Qué puede salir mal al leer una etiqueta, y cómo se cuenta.
 *
 * Un mensaje técnico en pantalla —"Failed to load TesseractCore"— no ayuda a
 * nadie: no dice qué ha pasado ni qué hacer. Aquí cada fallo se clasifica en
 * una de seis causas, y cada causa tiene un texto que explica el qué y ofrece
 * una salida que existe de verdad en la pantalla.
 *
 * Módulo puro: entra un error, sale una clasificación. Se prueba sin navegador.
 */

export type LabelScanFailure =
  /** No hay cámara, o el navegador no la deja abrir. */
  | 'camera_unavailable'
  /** La persona (o el navegador) ha denegado el permiso. */
  | 'permission_denied'
  /** El motor de OCR no se ha podido descargar o arrancar. */
  | 'engine_load_failed'
  /** El motor arrancó pero se rompió leyendo. */
  | 'worker_failed'
  /** La foto no da texto: borrosa, oscura, lejos. */
  | 'unreadable_image'
  /** Se leyó algo, pero no llega ni a un puñado de caracteres. */
  | 'no_text';

/** Error con causa identificada. Lo que la pantalla sabe manejar. */
export class LabelScanError extends Error {
  constructor(
    readonly kind: LabelScanFailure,
    readonly detail?: string,
  ) {
    super(`[AliApp] lectura de etiqueta: ${kind}${detail ? ` (${detail})` : ''}`);
    this.name = 'LabelScanError';
  }
}

function nombreDeError(cause: unknown): string {
  if (cause && typeof cause === 'object' && 'name' in cause) {
    return String((cause as { name: unknown }).name);
  }
  return '';
}

function mensajeDeError(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return typeof cause === 'string' ? cause : '';
}

/**
 * Clasifica un fallo de `getUserMedia`.
 *
 * Los nombres vienen del estándar: `NotAllowedError` es permiso denegado y el
 * resto —sin cámara, ocupada, restricciones imposibles— son la misma historia
 * para quien mira la pantalla: aquí no se puede abrir la cámara, usa una foto.
 */
export function classifyCameraError(cause: unknown): LabelScanFailure {
  const nombre = nombreDeError(cause);

  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
    return 'permission_denied';
  }

  return 'camera_unavailable';
}

/**
 * Clasifica un fallo del OCR.
 *
 * La distinción que importa: si el motor no llegó a cargar, reintentar suele
 * funcionar (fue la red). Si cargó y se rompió leyendo, reintentar con la
 * misma foto es lo razonable antes de rendirse.
 */
export function classifyOcrError(cause: unknown): LabelScanFailure {
  if (cause instanceof LabelScanError) return cause.kind;

  const nombre = nombreDeError(cause);
  const mensaje = mensajeDeError(cause).toLowerCase();

  if (nombre === 'LabelOcrUnavailableError') return 'engine_load_failed';

  const pistasDeCarga = [
    'tesseractcore',
    'importscripts',
    'failed to fetch',
    'networkerror',
    'network error',
    'load',
    '404',
    'wasm',
    'webassembly',
  ];

  if (pistasDeCarga.some((pista) => mensaje.includes(pista))) {
    return 'engine_load_failed';
  }

  return 'worker_failed';
}

export type FailureCopy = {
  title: TranslationKey;
  hint: TranslationKey;
};

/**
 * Texto de cada fallo.
 *
 * Cada pista apunta a algo que la pantalla ofrece de verdad: elegir una foto
 * del dispositivo, volver a tocar "Usar esta foto", o repetir la foto. Nunca a
 * una acción que no existe.
 */
export const FAILURE_COPY: Record<LabelScanFailure, FailureCopy> = {
  camera_unavailable: {
    title: 'label.error.cameraUnavailable',
    hint: 'label.error.cameraUnavailableHint',
  },
  permission_denied: {
    title: 'label.error.permissionDenied',
    hint: 'label.error.permissionDeniedHint',
  },
  engine_load_failed: {
    title: 'label.error.engineLoad',
    hint: 'label.error.engineLoadHint',
  },
  worker_failed: {
    title: 'label.error.worker',
    hint: 'label.error.workerHint',
  },
  unreadable_image: {
    title: 'label.error.unreadable',
    hint: 'label.error.unreadableHint',
  },
  no_text: {
    title: 'label.error.noText',
    hint: 'label.error.noTextHint',
  },
};

/** ¿Vale la pena volver a intentarlo con la misma foto? */
export function isRetryable(kind: LabelScanFailure): boolean {
  return kind === 'engine_load_failed' || kind === 'worker_failed';
}
