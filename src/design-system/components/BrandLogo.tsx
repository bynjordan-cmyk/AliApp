import { Image, View, useWindowDimensions, type ImageStyle } from 'react-native';

import { useT } from '@/lib/i18n';
import { colors, spacing, typography } from '../tokens';
import { Text } from './Text';

/**
 * Logotipo oficial de AliApp.
 *
 * Los ficheros de marca son la fuente: el logotipo no se redibuja con iconos ni
 * con tipografía del sistema. Hay tres piezas y cada una tiene su sitio:
 *
 *   compact  isotipo + nombre. El uso normal, en cabeceras de pantalla.
 *   full     añade el eslogan. Solo donde se muestra grande (acceso, portada):
 *            por debajo de ~64 px de alto el eslogan deja de leerse.
 *   mark     solo el isotipo, para espacios estrechos.
 *
 * `monochrome` sirve la versión navy, para fondos de color.
 */

const FUENTES = {
  compact: {
    color: { src: require('../../../assets/logo-aliapp-compacto.png'), ratio: 885 / 240 },
    navy: { src: require('../../../assets/logo-aliapp-compacto-azul.png'), ratio: 904 / 240 },
  },
  full: {
    color: { src: require('../../../assets/logo-aliapp.png'), ratio: 827 / 240 },
    navy: { src: require('../../../assets/logo-aliapp-azul.png'), ratio: 838 / 240 },
  },
  mark: {
    color: { src: require('../../../assets/isotipo-aliapp.png'), ratio: 1 },
    navy: { src: require('../../../assets/isotipo-aliapp.png'), ratio: 1 },
  },
} as const;

/** Altura mínima a la que el eslogan sigue siendo legible. */
export const MIN_ALTURA_CON_ESLOGAN = 64;

export type BrandLogoProps = {
  variant?: keyof typeof FUENTES;
  monochrome?: boolean;
  /** Altura en puntos; el ancho se deriva de la proporción original. */
  height?: number;
  style?: ImageStyle;
};

export function BrandLogo({
  variant = 'compact',
  monochrome = false,
  height = 32,
  style,
}: BrandLogoProps) {
  const t = useT();
  const { width: viewportWidth } = useWindowDimensions();
  height = Math.min(height, Math.max(32, (viewportWidth - 64) / 3.8));

  // Un eslogan ilegible es ruido: por debajo del mínimo se usa la versión corta.
  const efectiva = variant === 'full' && height < MIN_ALTURA_CON_ESLOGAN ? 'compact' : variant;
  const fuente = FUENTES[efectiva][monochrome ? 'navy' : 'color'];

  // Keep the high-resolution source intact. Clip its white margins at render
  // time instead of baking another small, repeatedly resampled PNG.
  if (!monochrome && efectiva !== 'mark') {
    const scale = height / 515;
    const width = 1840 * scale;
    return (
      <View style={[{ width }, style]}>
        <View style={{ width, height, overflow: 'hidden', backgroundColor: colors.surface }}>
          <Image
            source={require('../../../assets/brand/aliapp-clean-white.png')}
            accessibilityLabel={t('common.appName')}
            accessibilityRole="image"
            resizeMode="contain"
            style={{
              position: 'absolute',
              width: 1942 * scale,
              height: 809 * scale,
              left: -35 * scale,
              top: -145 * scale,
            }}
          />
        </View>
        {efectiva === 'full' ? (
          <Text
            style={{
              ...typography.overline,
              fontSize: 10,
              lineHeight: 16,
              letterSpacing: 1,
              marginTop: spacing.sm,
            }}
            center
          >
            {t('brand.signature')}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <Image
      source={fuente.src}
      accessibilityLabel={t('common.appName')}
      accessibilityRole="image"
      resizeMode="contain"
      style={[{ width: height * fuente.ratio, height }, style]}
    />
  );
}
