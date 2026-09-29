import { useRef, useState } from 'react';
import { Button, Text, colors } from '@/design-system';
import { useT } from '@/lib/i18n';
import { documentContentType, MAX_DOCUMENT_BYTES } from './document-validation';
import type { DocumentPickerProps } from './DocumentPicker';

export function DocumentPicker({ disabled, onPick }: DocumentPickerProps) {
  const t = useT();
  const [error, setError] = useState(false);
  const [reading, setReading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        label={t('documents.upload')}
        disabled={disabled || reading}
        onPress={() => picker.current?.click()}
      />
      <input
        ref={picker}
        style={{ display: 'none' }}
        aria-label={t('documents.upload')}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        disabled={disabled}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          setError(false);
          if (!file) return;
          setReading(true);
          try {
            if (file.size > MAX_DOCUMENT_BYTES) throw new Error('Too large');
            const body = await file.arrayBuffer();
            const type = documentContentType(new Uint8Array(body));
            if (!type) throw new Error('Invalid file');
            await onPick({ name: file.name, type, body });
          } catch {
            setError(true);
          } finally {
            setReading(false);
          }
        }}
      />
      {error ? (
        <Text color={colors.error} accessibilityRole="alert">
          {t('documents.uploadError')}
        </Text>
      ) : null}
    </>
  );
}
