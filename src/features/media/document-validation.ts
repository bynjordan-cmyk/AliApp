export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export function documentContentType(bytes: Uint8Array): string | null {
  if (bytes.length === 0 || bytes.length > MAX_DOCUMENT_BYTES) return null;
  if ([0x25, 0x50, 0x44, 0x46, 0x2d].every((value, i) => bytes[i] === value))
    return 'application/pdf';
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, i) => bytes[i] === value))
    return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}
