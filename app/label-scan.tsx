import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
  spacing,
} from '@/design-system';
import { useActiveBaby } from '@/features/baby/ActiveBabyProvider';
import { normalizeIngredient, parseIngredientList } from '@/features/labels/ingredients';
import {
  buildLabelScanResult,
  describeDetected,
  type LabelScanFinding,
  type LabelScanResult,
} from '@/features/labels/label-scan';
import { isMockOcr, recognizeLabel } from '@/features/labels/ocr';
import { useLabelCatalog } from '@/features/labels/useLabelCatalog';
import { useI18n } from '@/lib/i18n';

type Paso = 'capturar' | 'confirmar' | 'resultados';

/**
 * Leer una etiqueta.
 *
 * El camino es siempre el mismo y siempre termina en la persona:
 *
 *   foto o texto → se lee → se enseña lo leído tal cual → la persona confirma
 *   o corrige los ingredientes → se compara con SU panel de alimentos →
 *   resultados.
 *
 * Los resultados hablan de coincidencias de texto con una lista que hizo una
 * familia. Nunca dicen que algo sea seguro, ni que se pueda dar, ni que no
 * contenga alérgenos: AliApp no sabe qué lleva dentro un envase (§10).
 *
 * Por eso el aviso de verificar la etiqueta original está SIEMPRE en pantalla,
 * haya coincidencias o no.
 */
export default function LabelScanScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { baby } = useActiveBaby();
  const { catalog, statusByKey, hasAvoidList, isLoading, isError, refetch } = useLabelCatalog(
    baby?.id ?? null,
  );

  const [paso, setPaso] = useState<Paso>('capturar');
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textoCrudo, setTextoCrudo] = useState('');
  const [ingredientes, setIngredientes] = useState<string[]>([]);
  const [descartados, setDescartados] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState('');
  const [manual, setManual] = useState(false);
  const [resultado, setResultado] = useState<LabelScanResult | null>(null);
  const [lecturaDeEjemplo, setLecturaDeEjemplo] = useState(false);

  const leerFoto = async (fuente: 'camera' | 'library') => {
    setError(null);

    // El permiso se pide aquí, cuando la persona decide leer una etiqueta.
    const permiso =
      fuente === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      setError(t('media.permissionNeeded'));
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

    setLeyendo(true);
    try {
      const lectura = await recognizeLabel(activo.uri);
      setLecturaDeEjemplo(isMockOcr());
      aceptarTexto(lectura.text);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLeyendo(false);
    }
  };

  /** Pasa del texto leído a la lista de ingredientes que se va a confirmar. */
  const aceptarTexto = (texto: string) => {
    const detectados = parseIngredientList(texto);
    setTextoCrudo(texto);
    setIngredientes(detectados);
    setDescartados([]);
    setPaso(detectados.length > 0 ? 'confirmar' : 'capturar');
    if (detectados.length === 0) setError(t('label.unreadable'));
  };

  const confirmados = ingredientes.filter((item) => !descartados.includes(item));

  const comparar = () => {
    setResultado(
      buildLabelScanResult({
        rawText: textoCrudo,
        catalog,
        statusByKey,
        confirmedIngredients: confirmados,
      }),
    );
    setPaso('resultados');
  };

  const empezarDeNuevo = () => {
    setPaso('capturar');
    setTextoCrudo('');
    setIngredientes([]);
    setDescartados([]);
    setResultado(null);
    setError(null);
    setManual(false);
  };

  return (
    <Screen>
      <PageHeader title={t('label.title')} icon="scan-outline" />

      <QueryState loading={isLoading} error={isError} onRetry={refetch}>
        <Text color={colors.textSecondary}>{t('label.intro')}</Text>
        <Text variant="caption" color={colors.textSecondary}>
          {t('label.limits')}
        </Text>

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
          <Card>
            <Button
              label={t('media.takePhoto')}
              loading={leyendo}
              onPress={() => {
                void leerFoto('camera');
              }}
            />
            <Button
              variant="secondary"
              label={t('media.fromLibrary')}
              onPress={() => {
                void leerFoto('library');
              }}
            />
            <Divider />
            {/* Sin cámara a mano, o con una etiqueta ilegible: se escribe. */}
            <Button
              variant="ghost"
              label={t('label.pasteText')}
              onPress={() => setManual((valor) => !valor)}
            />
            {manual ? (
              <View style={styles.stack}>
                <Input
                  label={t('label.rawText')}
                  placeholder={t('label.pastePlaceholder')}
                  value={textoCrudo}
                  onChangeText={setTextoCrudo}
                  multiline
                />
                <Button
                  label={t('label.confirmReading')}
                  disabled={textoCrudo.trim().length === 0}
                  onPress={() => {
                    setLecturaDeEjemplo(false);
                    aceptarTexto(textoCrudo);
                  }}
                />
              </View>
            ) : null}
            {leyendo ? (
              <Text variant="caption" color={colors.textSecondary}>
                {t('label.reading')}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {paso !== 'capturar' ? (
          <Card>
            <SectionHeader title={t('label.rawText')} subtitle={t('label.rawHint')} />
            <Text variant="caption">{textoCrudo}</Text>
            {lecturaDeEjemplo ? (
              <Text variant="caption" color={colors.textSecondary}>
                {t('label.mockNotice')}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {paso === 'confirmar' ? (
          <Card>
            <SectionHeader
              title={t('label.ingredients')}
              subtitle={t('label.ingredientsHint')}
            />
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
          </Card>
        ) : null}

        {paso === 'resultados' && resultado ? (
          <Resultados resultado={resultado} />
        ) : null}

        {/* Siempre visible, haya o no coincidencias. */}
        <Card>
          <Text variant="bodyStrong">{t('label.verifyOriginal')}</Text>
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

function Resultados({ resultado }: { resultado: LabelScanResult }) {
  const { t } = useI18n();

  return (
    <View style={styles.stack}>
      <SectionHeader title={t('label.results')} />

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
});
