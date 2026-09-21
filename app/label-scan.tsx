import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  Divider,
  Input,
  PageHeader,
  QueryState,
  Screen,
  SectionHeader,
  Text,
  colors,
  radius,
  spacing,
} from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { LabelCapture } from '@/features/labels/LabelCapture';
import { normalizeIngredient, parseIngredientList } from '@/features/labels/ingredients';
import {
  buildLabelScanResult,
  describeDetected,
  type LabelScanFinding,
  type LabelScanResult,
} from '@/features/labels/label-scan';
import {
  getLabelOcrProvider,
  hasUsableText,
  type LabelOcrImage,
  type LabelOcrResult,
} from '@/features/labels/ocr';
import { useLabelCatalog } from '@/features/labels/useLabelCatalog';
import { useI18n } from '@/lib/i18n';

/**
 * Leer una etiqueta, de verdad y en cualquier plataforma.
 *
 * El camino es siempre el mismo —web, iOS o Android— y siempre termina en la
 * persona:
 *
 *   foto → previsualización → "usar" o "repetir" → se lee el texto →
 *   se enseña TAL CUAL y se puede corregir → ingredientes →
 *   comparación con SU panel de alimentos → resultados
 *
 * Qué motor lee el texto no se decide aquí: esta pantalla pide
 * `getLabelOcrProvider()` y recibe texto normalizado. En web es tesseract.js
 * sobre WebAssembly; en el teléfono, ML Kit. Cambiar de motor no toca este
 * fichero.
 *
 * Dos reglas que no se negocian:
 *
 *   · La interpretación NUNCA se guarda sola. El texto detectado es editable
 *     antes de comparar, porque el OCR se equivoca y quien tiene el envase en
 *     la mano es quien sabe lo que pone.
 *   · Los resultados hablan de coincidencias de TEXTO con una lista que hizo
 *     una familia. Nunca de que un producto sea seguro, ni de que se pueda dar,
 *     ni de que no contenga alérgenos (§10).
 */

type Paso = 'capturar' | 'revisar' | 'leyendo' | 'texto' | 'ingredientes' | 'resultados';

export default function LabelScanScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { baby } = useActiveBaby();
  const { catalog, statusByKey, hasAvoidList, isLoading, isError, refetch } = useLabelCatalog(
    baby?.id ?? null,
  );

  const provider = useMemo(() => getLabelOcrProvider(), []);
  const [motorDisponible, setMotorDisponible] = useState<boolean | null>(null);

  const [paso, setPaso] = useState<Paso>('capturar');
  const [imagen, setImagen] = useState<LabelOcrImage | null>(null);
  const [progreso, setProgreso] = useState(0);
  const [lectura, setLectura] = useState<LabelOcrResult | null>(null);
  const [texto, setTexto] = useState('');
  const [ingredientes, setIngredientes] = useState<string[]>([]);
  const [descartados, setDescartados] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [resultado, setResultado] = useState<LabelScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void provider.isAvailable().then((disponible) => {
      if (vivo) setMotorDisponible(disponible);
    });
    return () => {
      vivo = false;
    };
  }, [provider]);

  const leer = async (origen: LabelOcrImage) => {
    setPaso('leyendo');
    setProgreso(0);
    setError(null);

    try {
      const salida = await provider.recognize(origen, setProgreso);

      if (!hasUsableText(salida)) {
        setError(t('label.unreadable'));
        setPaso('revisar');
        return;
      }

      setLectura(salida);
      setTexto(salida.rawText);
      setPaso('texto');
    } catch (cause) {
      setError((cause as Error).message);
      setPaso('revisar');
    }
  };

  const extraerIngredientes = () => {
    const detectados = parseIngredientList(texto);

    if (detectados.length === 0) {
      setError(t('label.unreadable'));
      return;
    }

    setIngredientes(detectados);
    setDescartados([]);
    setError(null);
    setPaso('ingredientes');
  };

  const confirmados = ingredientes.filter((item) => !descartados.includes(item));

  const comparar = () => {
    setResultado(
      buildLabelScanResult({
        rawText: texto,
        catalog,
        statusByKey,
        confirmedIngredients: confirmados,
      }),
    );
    setPaso('resultados');
  };

  const empezarDeNuevo = () => {
    setPaso('capturar');
    setImagen(null);
    setLectura(null);
    setTexto('');
    setIngredientes([]);
    setDescartados([]);
    setResultado(null);
    setError(null);
    setProgreso(0);
  };

  return (
    <Screen>
      <PageHeader title={t('label.title')} icon="scan-outline" />

      <QueryState loading={isLoading} error={isError} onRetry={refetch}>
        <Text color={colors.textSecondary}>{t('label.intro')}</Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('label.privacy')}
        </Text>

        {motorDisponible === false ? (
          <Card>
            <Text variant="bodyStrong">{t('label.unavailable')}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t('label.unavailableHint')}
            </Text>
          </Card>
        ) : null}

        {!hasAvoidList ? (
          <Card>
            <Text variant="bodyStrong">{t('label.noAvoidList')}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              {t('label.noAvoidListHint')}
            </Text>
          </Card>
        ) : null}

        {error ? (
          <Text variant="caption" color={colors.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        {paso === 'capturar' ? (
          <LabelCapture
            onCaptured={(capturada) => {
              setImagen(capturada);
              setError(null);
              setPaso('revisar');
            }}
          />
        ) : null}

        {/* Previsualización: mirar la foto antes de gastar tiempo leyéndola. */}
        {paso === 'revisar' && imagen ? (
          <Card>
            <Image source={{ uri: imagen.uri }} style={styles.preview} resizeMode="contain" />
            <Button label={t('label.usePhoto')} onPress={() => void leer(imagen)} />
            <Button variant="secondary" label={t('label.retake')} onPress={empezarDeNuevo} />
          </Card>
        ) : null}

        {paso === 'leyendo' ? (
          <Card>
            <Text variant="bodyStrong">{t('label.reading')}</Text>
            <ProgressBar value={progreso} />
            <Text variant="caption" color={colors.textSecondary}>
              {t('label.processingHint')}
            </Text>
          </Card>
        ) : null}

        {/* El texto se enseña siempre y se puede corregir siempre. */}
        {paso === 'texto' ? (
          <Card>
            <SectionHeader title={t('label.rawText')} subtitle={t('label.editText')} />
            <Input
              label={t('label.rawText')}
              value={texto}
              onChangeText={setTexto}
              multiline
              numberOfLines={8}
              style={styles.textoLeido}
            />
            {lectura ? (
              <Text variant="caption" color={colors.textSecondary}>
                {lectura.engine === 'fixture'
                  ? t('label.fixtureNotice')
                  : t('label.engineNotice', { engine: lectura.engine })}
              </Text>
            ) : null}
            <Button
              label={t('label.continueStep')}
              disabled={texto.trim().length === 0}
              onPress={extraerIngredientes}
            />
            <Button variant="ghost" label={t('label.retake')} onPress={empezarDeNuevo} />
          </Card>
        ) : null}

        {paso === 'ingredientes' ? (
          <Card>
            <SectionHeader title={t('label.ingredients')} subtitle={t('label.ingredientsHint')} />
            <View style={styles.chips}>
              {ingredientes.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={!descartados.includes(item)}
                  onPress={() =>
                    setDescartados((actuales) =>
                      actuales.includes(item)
                        ? actuales.filter((otro) => otro !== item)
                        : [...actuales, item],
                    )
                  }
                />
              ))}
            </View>

            <Input
              label={t('label.addIngredient')}
              value={nuevo}
              onChangeText={setNuevo}
              onSubmitEditing={() => {
                const limpio = normalizeIngredient(nuevo);
                if (limpio.length >= 3 && !ingredientes.includes(limpio)) {
                  setIngredientes((actuales) => [...actuales, limpio]);
                }
                setNuevo('');
              }}
            />

            <Button
              label={t('label.confirmReading')}
              disabled={confirmados.length === 0}
              onPress={comparar}
            />
            <Button variant="ghost" label={t('common.back')} onPress={() => setPaso('texto')} />
          </Card>
        ) : null}

        {paso === 'resultados' && resultado ? <Resultados resultado={resultado} /> : null}

        {/* Siempre visible, en todos los pasos y haya o no coincidencias. */}
        <Card>
          <Text variant="bodyStrong">{t('label.verifyOriginal')}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {t('label.ocrMayErr')}
          </Text>
          <Divider />
          <Text variant="caption" color={colors.textSecondary}>
            {t('safety.notDiagnostic')}
          </Text>
        </Card>

        {paso === 'resultados' ? (
          <Button variant="secondary" label={t('label.scanAgain')} onPress={empezarDeNuevo} />
        ) : null}

        <Button variant="ghost" label={t('common.close')} onPress={() => router.back()} />
      </QueryState>
    </Screen>
  );
}

/** Barra de progreso simple: leer una etiqueta tarda y hay que notarlo. */
function ProgressBar({ value }: { value: number }) {
  const porcentaje = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <View
      style={styles.barra}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: porcentaje, min: 0, max: 100 }}
    >
      <View style={[styles.barraRelleno, { width: `${porcentaje}%` }]} />
    </View>
  );
}

function Resultados({ resultado }: { resultado: LabelScanResult }) {
  const { t } = useI18n();

  return (
    <View style={styles.stack}>
      <SectionHeader title={t('label.results')} subtitle={t('label.matchesIntro')} />

      {/* Lo leído, enumerado. Sin adjetivos ni conclusiones. */}
      <Card>
        <Text>{t('label.detected', { ingredients: describeDetected(resultado) })}</Text>
      </Card>

      {resultado.avoid.length > 0 ? (
        <Card tone="highlight">
          {resultado.avoid.map((hallazgo) => (
            <Text key={`${hallazgo.ingredient}-${hallazgo.canonicalKey}`} variant="bodyStrong">
              {t('label.matchAvoid', { ingredient: capitalizar(hallazgo.matchedTerm) })}
            </Text>
          ))}
        </Card>
      ) : null}

      {resultado.supervision.length > 0 ? (
        <Card>
          {resultado.supervision.map((hallazgo) => (
            <Text key={`${hallazgo.ingredient}-${hallazgo.canonicalKey}`}>
              {t('label.matchSupervision', { ingredient: capitalizar(hallazgo.matchedTerm) })}
            </Text>
          ))}
        </Card>
      ) : null}

      {resultado.avoid.length === 0 ? (
        <Card>
          {/* Nunca "no contiene": esto habla de la lista, no del producto. */}
          <Text>{t('label.noMatches')}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {t('label.noMatchesHint')}
          </Text>
        </Card>
      ) : null}

      {resultado.other.length > 0 ? (
        <Card>
          {resultado.other.map((hallazgo: LabelScanFinding) => (
            <Text key={`${hallazgo.ingredient}-${hallazgo.canonicalKey}`} variant="caption">
              {t('label.matchOther', {
                ingredient: capitalizar(hallazgo.matchedTerm),
                food: hallazgo.displayName,
              })}
            </Text>
          ))}
        </Card>
      ) : null}

      {resultado.unmatched.length > 0 ? (
        <Card>
          <Text variant="overline" color={colors.textSecondary}>
            {t('label.unmatched')}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {resultado.unmatched.join(', ')}
          </Text>
        </Card>
      ) : null}
    </View>
  );
}

function capitalizar(valor: string): string {
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: {
    width: '100%',
    height: 260,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  textoLeido: { minHeight: 160, textAlignVertical: 'top' },
  barra: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barraRelleno: { height: 8, borderRadius: radius.pill, backgroundColor: colors.brand },
});
