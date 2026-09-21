import { useWindowDimensions } from 'react-native';

/**
 * Adaptación a tamaño de pantalla.
 *
 * AliApp se diseña primero para el móvil de una madre con una mano ocupada,
 * pero la versión web se abre en un portátil: sin límite de ancho, el contenido
 * se estira y deja de leerse. Estos umbrales son el único sitio donde se decide
 * qué es "pantalla grande".
 */

export const breakpoints = {
  /** Móvil: navegación abajo, una sola columna. */
  compact: 0,
  /** Tablet o ventana mediana: contenido acotado, navegación abajo. */
  medium: 768,
  /** Escritorio: navegación lateral y contenido centrado. */
  expanded: 1024,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** Ancho máximo de una columna de lectura cómoda. */
export const CONTENT_MAX_WIDTH = 760;

/** Ancho de la navegación lateral en escritorio. */
export const SIDEBAR_WIDTH = 232;

export type LayoutInfo = {
  width: number;
  breakpoint: Breakpoint;
  /** Navegación lateral en lugar de barra inferior. */
  isDesktop: boolean;
  /** Hay espacio de sobra a los lados del contenido. */
  isWide: boolean;
};

export function useLayout(): LayoutInfo {
  const { width } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= breakpoints.expanded ? 'expanded' : width >= breakpoints.medium ? 'medium' : 'compact';

  return {
    width,
    breakpoint,
    isDesktop: breakpoint === 'expanded',
    isWide: breakpoint !== 'compact',
  };
}
