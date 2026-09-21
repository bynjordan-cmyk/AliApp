import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text, colors, spacing } from '@/design-system';
import { useI18n } from '@/lib/i18n';

import type { LabelOcrImage } from './ocr-types';

/**
 * Capturar una etiqueta en iOS y Android.
 *
 * La cámara del sistema ya da previsualización y un "repetir" nativo, así que
 * aquí no se reinventa: se pide la foto y se devuelve su ruta local. El
 * permiso se pide en el momento en que alguien decide leer una etiqueta, no
 * al abrir la aplicación.
 *
 * La foto no se sube ni se guarda: viaja al motor de OCR del propio teléfono
 * y ahí se queda.
 *
 * (La versión web de este componente vive en `LabelCapture.web.tsx`.)
 */

export type LabelCaptureProps = {
  onCaptured: (image: LabelOcrImage) => void;
};

export function LabelCapture({ onCaptured }: LabelCaptureProps) {
  const { t } = useI18n();
  const [aviso, setAviso] = useState<string | null>(null);

  const pedir = async (fuente: 'camera' | 'library') => {
    setAviso(null);

    const permiso =
      fuente === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      setAviso(t('media.permissionNeeded'));
      return;
    }

    const seleccion =
      fuente === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1, exif: false })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 1,
            exif: false,
            mediaTypes: ['images'],
          });

    if (seleccion.canceled) return;

    const activo = seleccion.assets[0];
    if (!activo) return;

    onCaptured({ uri: activo.uri, width: activo.width, height: activo.height });
  };

  return (
    <Card>
      <View style={styles.marco}>
        <Button
          label={t('label.takePhoto')}
          onPress={() => {
            void pedir('camera');
          }}
        />
        <Button
          variant="secondary"
          label={t('media.fromLibrary')}
          onPress={() => {
            void pedir('library');
          }}
        />
        {aviso ? (
          <Text variant="caption" color={colors.textSecondary} accessibilityRole="alert">
            {aviso}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  marco: { gap: spacing.md },
});
