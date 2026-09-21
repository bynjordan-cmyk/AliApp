/**
 * Identificadores de dominio generados en el cliente.
 *
 * Requisito de arquitectura offline (§19): ninguna entidad depende de un id
 * secuencial del servidor. Toda fila se crea con un UUID v4 generado aquí, de
 * forma que una mutación encolada sin conexión ya conoce su propio id.
 */

type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T;
};

function getCrypto(): CryptoLike | undefined {
  return (globalThis as { crypto?: CryptoLike }).crypto;
}

function uuidFromBytes(bytes: Uint8Array): string {
  // Marca versión 4 y variante RFC 4122.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let index = 0; index < bytes.length; index += 1) {
    hex.push((bytes[index] ?? 0).toString(16).padStart(2, '0'));
  }

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

/**
 * Genera un UUID v4. Usa la API criptográfica de la plataforma cuando existe.
 * En React Native, `expo-crypto` instala `crypto.getRandomValues` al importarse
 * desde el arranque de la app (`app/_layout.tsx`).
 */
export function newId(): string {
  const cryptoApi = getCrypto();

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof cryptoApi?.getRandomValues === 'function') {
    cryptoApi.getRandomValues(bytes);
    return uuidFromBytes(bytes);
  }

  // Último recurso (solo entornos sin API criptográfica, p. ej. algún test).
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return uuidFromBytes(bytes);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
