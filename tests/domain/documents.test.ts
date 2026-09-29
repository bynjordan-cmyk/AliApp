import { documentContentType, MAX_DOCUMENT_BYTES } from '@/features/media/document-validation';

test('accepts signatures of supported documents without trusting a file extension', () => {
  expect(documentContentType(new Uint8Array([37, 80, 68, 70, 45, 49]))).toBe('application/pdf');
  expect(documentContentType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
  expect(documentContentType(new Uint8Array([255, 216, 255]))).toBe('image/jpeg');
  expect(documentContentType(new TextEncoder().encode('<script>alert(1)</script>'))).toBeNull();
});
test('rejects empty and oversized files', () => {
  expect(documentContentType(new Uint8Array())).toBeNull();
  const bytes = new Uint8Array(MAX_DOCUMENT_BYTES + 1);
  bytes.set([255, 216, 255]);
  expect(documentContentType(bytes)).toBeNull();
});
