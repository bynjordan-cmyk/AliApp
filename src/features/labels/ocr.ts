/**
 * Lectura de texto de una foto (OCR).
 *
 * Aquí solo vive el CONTRATO. AliApp no depende de ningún proveedor concreto:
 * la pantalla pide `recognizeLabel(uri)` y recibe texto, venga de donde venga.
 *
 * Mientras no haya un proveedor real configurado, funciona un lector de
 * ejemplo. Es una decisión consciente: la pantalla, la normalización y la
 * comparación con el panel de alimentos son útiles y se pueden probar desde
 * hoy, y el día que se conecte un OCR de verdad no cambia nada más que este
 * fichero.
 *
 * Y se dice en pantalla cuando la lectura es de ejemplo: una madre tiene que
 * saber si lo que está viendo salió de su foto o de una demostración.
 */

export type OcrResult = {
  text: string;
  /** Proveedor que leyó el texto. La interfaz lo usa para ser honesta. */
  provider: 'mock' | string;
};

export type OcrProvider = {
  name: string;
  recognize(imageUri: string): Promise<OcrResult>;
};

/**
 * Lector de ejemplo.
 *
 * Devuelve una etiqueta verosímil, con la jerga que de verdad aparece en los
 * envases (caseinato, lactosuero, aceite de girasol…), para que el resto del
 * camino —normalizar, comparar, confirmar— se pueda ver y probar entero.
 */
export const mockOcrProvider: OcrProvider = {
  name: 'mock',
  async recognize(): Promise<OcrResult> {
    return {
      provider: 'mock',
      text: [
        'INGREDIENTES: harina de trigo, aceite de girasol,',
        'leche en polvo desnatada (caseinato), azúcar,',
        'lecitina de soja, sal, aroma de vainilla.',
        'Puede contener trazas de frutos secos.',
      ].join(' '),
    };
  },
};

let provider: OcrProvider = mockOcrProvider;

/**
 * Enchufa un lector real.
 *
 * Se llama una vez al arrancar, desde la capa que sepa qué proveedor toca.
 * Ningún módulo de dominio conoce al proveedor.
 */
export function setOcrProvider(next: OcrProvider): void {
  provider = next;
}

export function getOcrProvider(): OcrProvider {
  return provider;
}

/** ¿Lo que se va a leer sale de una foto de verdad o de la demostración? */
export function isMockOcr(): boolean {
  return provider.name === 'mock';
}

export async function recognizeLabel(imageUri: string): Promise<OcrResult> {
  return provider.recognize(imageUri);
}
