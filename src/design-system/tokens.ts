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
  muted: '#6B7B91',
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
  textPrimary: palette.ink,
  textSecondary: palette.muted,
  textOnAccent: palette.white,
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
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Minimum interactive size (accessibility rule §21: 44px+ touch targets). */
export const touchTarget = {
  min: 44,
  comfortable: 52,
} as const;

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
} as const;

export type TypographyVariant = keyof typeof typography;

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
