/**
 * AliApp approved design tokens.
 *
 * These are the single source of truth for colour, spacing, radius, type and
 * elevation. Never hard-code a colour in a screen or component: if a value is
 * missing here, add it here first.
 */

export const palette = {
  // Primary brand
  coral: '#FF6B6B',
  navy: '#0F2D5B',
  aqua: '#22D3EE',
  sunshine: '#FFC93C',
  lavender: '#C4B5FD',
  white: '#FFFFFF',

  // Supporting
  background: '#F7FAFF',
  ink: '#18314E',
  // Desviación documentada: el valor aprobado (#6B7B91) se queda en 4.31:1
  // sobre blanco y no alcanza el mínimo AA de 4.5:1 para texto pequeño.
  // Este tono conserva el mismo carácter y sube a 5.75:1 (ver docs/architecture.md).
  muted: '#58677D',
  line: '#DDE7F0',
  softCoral: '#FFF0F0',
  softAqua: '#ECFBFF',
  softSunshine: '#FFF8DD',
  softLavender: '#F4F0FF',
} as const;

export type PaletteColor = keyof typeof palette;

/**
 * Semantic colours. Screens should reach for these, not for `palette`
 * directly, so that a future dark mode or theme swap stays a one-file change.
 */
export const colors = {
  surface: palette.white,
  surfaceMuted: palette.background,
  screen: palette.white,
  textPrimary: palette.navy,
  textSecondary: palette.muted,
  textOnAccent: palette.white,
  textOnCoral: palette.navy,
  // Color añadido fuera de la paleta aprobada: el coral de marca sobre blanco
  // da 2.78:1 y un mensaje de error no puede ser ilegible. Este rojo da 6.76:1.
  error: '#A62F42',
  transparent: 'transparent',
  border: palette.line,
  accent: palette.coral,
  accentSoft: palette.softCoral,
  brand: palette.navy,
  info: palette.aqua,
  infoSoft: palette.softAqua,
  highlight: palette.sunshine,
  highlightSoft: palette.softSunshine,
  calm: palette.lavender,
  calmSoft: palette.softLavender,
  focusRing: palette.aqua,
} as const;

/**
 * Colour per event family. Used by the timeline and the quick-log sheet so an
 * event type reads the same everywhere. Colour is never the only signal:
 * every usage also carries an icon and a text label (accessibility rule §21).
 */
export const eventColors = {
  feeding: palette.coral,
  breastfeed: palette.lavender,
  food: palette.coral,
  diaper: palette.aqua,
  symptom: palette.sunshine,
  episode: palette.navy,
  medication: palette.lavender,
  journey: palette.navy,
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/** Minimum interactive size (accessibility rule §21: 44px+ touch targets). */
export const touchTarget = {
  min: 44,
  comfortable: 52,
} as const;

export const typography = {
  // 12px es el mínimo cómodo en Android y web; iOS usa 10, pero aquí manda
  // la pantalla más exigente (§21).
  navigation: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
} as const;

export type TypographyVariant = keyof typeof typography;

/**
 * Superficies de acento por familia de evento.
 *
 * Son fondos suaves, no etiquetas de estado: acompañan siempre a un icono y a
 * un texto, nunca comunican nada por sí solas (§21).
 */
export const surfaces = {
  feeding: { background: palette.softCoral, ink: palette.navy, accent: palette.coral },
  breastfeed: { background: palette.softLavender, ink: palette.navy, accent: palette.lavender },
  diaper: { background: palette.softAqua, ink: palette.navy, accent: palette.aqua },
  symptom: { background: palette.softSunshine, ink: palette.navy, accent: palette.sunshine },
  episode: { background: '#EEF3FB', ink: palette.navy, accent: palette.navy },
  medication: { background: palette.softLavender, ink: palette.navy, accent: palette.lavender },
  journey: { background: '#EEF3FB', ink: palette.navy, accent: palette.navy },
  neutral: { background: palette.background, ink: palette.navy, accent: palette.line },
} as const;

export type SurfaceTone = keyof typeof surfaces;

export const elevation = {
  none: {},
  card: {
    shadowColor: palette.navy,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sheet: {
    shadowColor: palette.navy,
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  /** Para la tarjeta protagonista de Hoy: más presencia, sin estridencia. */
  hero: {
    shadowColor: palette.navy,
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;

export const theme = {
  palette,
  colors,
  eventColors,
  spacing,
  radius,
  touchTarget,
  typography,
  elevation,
} as const;

export type Theme = typeof theme;
