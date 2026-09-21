import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text, colors, radius, spacing } from '@/design-system';
import { useI18n } from '@/lib/i18n';

import { classifyCameraError, type LabelScanFailure } from './ocr-errors';
import type { LabelOcrImage } from './ocr-types';

/**
 * Capturar una etiqueta desde el navegador.
 *
 * Dos caminos, y los dos llevan al mismo sitio:
 *
 *   1. Cámara en vivo con `getUserMedia`, pidiendo la trasera (`environment`),
 *      que es la que enfoca un envase que tienes en la mano.
 *   2. Respaldo con `<input type="file" accept="image/*" capture>`. No es un
 *      premio de consolación: en bastantes navegadores móviles es lo que de
 *      verdad funciona, y en iOS abre directamente la cámara del sistema.
 *
 * El respaldo se ofrece SIEMPRE, no solo cuando la cámara falla. Quien esté
 * en un ordenador con una foto ya hecha no tiene por qué pelearse con una
 * webcam.
 *
 * La imagen se queda en la pestaña: se dibuja en un canvas y se convierte en
 * un data URL que va directo al motor de OCR. No se sube a ningún sitio y no
 * se guarda en la galería ni en AliApp.
 */

export type LabelCaptureProps = {
  onCaptured: (image: LabelOcrImage) => void;
  /** La pantalla decide cómo contar el fallo; aquí solo se clasifica. */
  onFailure: (kind: LabelScanFailure) => void;
};

const ANCHO_IDEAL = 1920;

export function LabelCapture({ onCaptured, onFailure }: LabelCaptureProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [enVivo, setEnVivo] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const detener = useCallback(() => {
    streamRef.current?.getTracks().forEach((pista) => pista.stop());
    streamRef.current = null;
    setEnVivo(false);
  }, []);

  // La cámara se apaga al salir de la pantalla. Dejar el piloto encendido en
  // el teléfono de alguien no es aceptable.
  useEffect(() => detener, [detener]);

  const abrirCamara = async () => {
    setAviso(null);
    setAbriendo(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        // Sin API de cámara: no es un permiso denegado, es que no la hay.
        throw Object.assign(new Error('sin getUserMedia'), { name: 'NotFoundError' });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: ANCHO_IDEAL },
        },
        audio: false,
      });

      streamRef.current = stream;
      setEnVivo(true);

      // El elemento existe una vez pintado el estado; se enlaza en el siguiente
      // ciclo para no depender del orden de renderizado.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (cause) {
      // Permiso denegado, sin cámara, o un navegador que no lo admite: no es
      // un callejón sin salida, es el otro camino. Se distingue la causa para
      // que el mensaje diga algo útil y no un "no se pudo" genérico.
      setAviso(t('label.cameraFallback'));
      onFailure(classifyCameraError(cause));
    } finally {
      setAbriendo(false);
    }
  };

  const tomarFoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexto = canvas.getContext('2d');
    if (!contexto) return;

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
    const uri = canvas.toDataURL('image/jpeg', 0.92);

    detener();
    onCaptured({ uri, width: canvas.width, height: canvas.height });
  };

  const desdeArchivo = (evento: { target: HTMLInputElement }) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = () => {
      if (typeof lector.result === 'string') {
        detener();
        onCaptured({ uri: lector.result });
      }
    };
    lector.readAsDataURL(archivo);
  };

  return (
    <Card>
      {enVivo ? (
        <View style={styles.marco}>
          {/* Elemento del navegador: react-native-web ya renderiza sobre el DOM. */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              width: '100%',
              borderRadius: radius.md,
              backgroundColor: colors.surfaceMuted,
              display: 'block',
            }}
          />
          <Button label={t('label.takePhoto')} onPress={tomarFoto} />
          <Button variant="ghost" label={t('common.cancel')} onPress={detener} />
        </View>
      ) : (
        <View style={styles.marco}>
          <Button
            label={t('label.openCamera')}
            loading={abriendo}
            onPress={() => {
              void abrirCamara();
            }}
          />

          {/* Respaldo siempre disponible, no solo cuando falla la cámara. */}
          <label style={{ display: 'block' }}>
            <Text variant="caption" color={colors.textSecondary}>
              {t('label.chooseFile')}
            </Text>
            <input
              type="file"
              accept="image/*"
              // En móvil abre la cámara del sistema; en escritorio, el
              // selector de archivos de siempre.
              capture="environment"
              onChange={desdeArchivo}
              style={{ marginTop: spacing.xs, width: '100%' }}
            />
          </label>

          {aviso ? (
            <Text variant="caption" color={colors.textSecondary} accessibilityRole="alert">
              {aviso}
            </Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  marco: { gap: spacing.md },
});
