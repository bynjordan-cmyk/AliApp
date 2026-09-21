import { Image, type ImageStyle } from 'react-native';

import { useT } from '@/lib/i18n';

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

  // Un eslogan ilegible es ruido: por debajo del mínimo se usa la versión corta.
  const efectiva = variant === 'full' && height < MIN_ALTURA_CON_ESLOGAN ? 'compact' : variant;
  const fuente = FUENTES[efectiva][monochrome ? 'navy' : 'color'];

  return (
    <Image
      source={fuente.src}
      accessibilityLabel={t('common.appName')}
      resizeMode="contain"
      style={[{ width: height * fuente.ratio, height }, style]}
    />
  );
}
