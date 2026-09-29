import { Text } from '@/design-system';
import { useT } from '@/lib/i18n';

export type DocumentFile = { name: string; type: string; body: ArrayBuffer };
export type DocumentPickerProps = {
  disabled: boolean;
  onPick: (file: DocumentFile) => Promise<void>;
};
export function DocumentPicker(_props: DocumentPickerProps) {
  const t = useT();
  return <Text>{t('documents.webOnly')}</Text>;
}
