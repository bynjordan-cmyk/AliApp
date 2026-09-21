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
 *   2. La **cámara del sistema**, con `<input type="file" capture>`. Es la
 *      recomendada en el móvil, y no por comodidad: la cámara de la página no
 *      tiene autoenfoque fiable en Chrome de Android, así que una lista de
 *      ingredientes sale borrosa por mucho que se acerque uno. La aplicación
 *      de cámara del teléfono enfoca, mide la luz y da la resolución entera.
 *   3. La **galería**, con el mismo `<input>` pero **sin `capture`**, para una
 *      foto o una captura de pantalla que ya existe. Con `capture` puesto,
 *      Chrome en Android abre la cámara y nunca ofrece la galería.
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

const ANCHO_IDEAL = 2560;

/**
 * Pide autoenfoque continuo si el navegador lo admite.
 *
 * `focusMode` no está en la definición estándar de TypeScript y no lo admiten
 * todos los navegadores, así que se pregunta antes y se falla en silencio: sin
 * autoenfoque la cámara sigue funcionando, solo que peor. Para la letra
 * pequeña de verdad está la cámara del sistema.
 */
async function pedirEnfoqueContinuo(stream: MediaStream): Promise<void> {
  const pista = stream.getVideoTracks()[0];
  if (!pista?.getCapabilities) return;

  try {
    const capacidades = pista.getCapabilities() as { focusMode?: string[] };
    if (!capacidades.focusMode?.includes('continuous')) return;

    await pista.applyConstraints({
      advanced: [{ focusMode: 'continuous' }],
    } as unknown as MediaTrackConstraints);
  } catch {
    // El navegador dice que puede y luego no puede. Se sigue sin ello.
  }
}

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
      await pedirEnfoqueContinuo(stream);

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
          {/*
            La cámara del sistema va primero, y no por gusto: es la única que
            enfoca bien una lista de ingredientes en un móvil.
          */}
          <label style={{ display: 'block' }}>
            <Text variant="bodyStrong">{t('label.systemCamera')}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t('label.systemCameraHint')}
            </Text>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={desdeArchivo}
              style={{ marginTop: spacing.xs, width: '100%' }}
            />
          </label>

          {/* Una foto o una captura que ya existe. SIN `capture`, o Chrome en
              Android abre la cámara y nunca ofrece la galería. */}
          <label style={{ display: 'block' }}>
            <Text variant="bodyStrong">{t('label.chooseFile')}</Text>
            <input
              type="file"
              accept="image/*"
              onChange={desdeArchivo}
              style={{ marginTop: spacing.xs, width: '100%' }}
            />
          </label>

          {/* Y la cámara dentro de la página, que en un ordenador es lo
              natural y en un móvil es el peor de los tres. */}
          <Button
            variant="ghost"
            label={t('label.openCamera')}
            loading={abriendo}
            onPress={() => {
              void abrirCamara();
            }}
          />
          <Text variant="caption" color={colors.textSecondary}>
            {t('label.openCameraHint')}
          </Text>

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
