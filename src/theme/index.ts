/**
 * Jam Music App — Design System Tokens
 * Spotify-authentic mobile design system tokens.
 *
 * Color architecture:
 *   Canvas (#121212) → Tab Bar (#000000) → Surface (#181818) → Elevated/Pressed (#282828)
 * Primary accent: Spotify green (#1ED760), pressed (#1DB954)
 */

export const colors = {
  /** Deep obsidian void — primary canvas background */
  background: '#121212',
  /** Deepest black — tab bar and base layer */
  backgroundDeep: '#000000',
  /** Surface level 1 — card backgrounds, grouped modules */
  backgroundElevated: '#181818',
  /** Surface level 2 — inputs, pressed surfaces, chips */
  backgroundInput: '#282828',
  /** Card background — alternate surface for contrast */
  backgroundCard: '#181818',
  /** Pressed state surface */
  backgroundPressed: '#282828',
  /** Tab bar background */
  backgroundTabBar: '#000000',

  /** Primary Spotify Green — active playback, CTAs, progress fills */
  accent: '#1ED760',
  /** Pressed Spotify Green */
  accentPressed: '#1DB954',
  /** Highlight / Light Accent */
  accentLight: '#1ED760',
  /** Secondary neutral */
  accentSecondary: '#B3B3B3',
  neonViolet: '#B3B3B3',
  neonPink: '#F3727F',

  /** Soft aura for active playing states */
  accentGlow: '#1ED760',

  /** Primary text — pure white */
  textPrimary: '#FFFFFF',
  /** Secondary text — neutral light grey */
  textSecondary: '#B3B3B3',
  /** Muted / disabled text */
  textMuted: '#6A6A6A',

  /** Hairline structural boundaries */
  divider: 'rgba(255, 255, 255, 0.08)',
  /** Elevated borders */
  borderNeon: 'rgba(255, 255, 255, 0.08)',
  borderViolet: 'rgba(255, 255, 255, 0.08)',
  /** Card stroke */
  borderCard: 'rgba(255, 255, 255, 0.08)',

  /** Destructive / error red */
  error: '#F3727F',

  /** Online / success indicator */
  online: '#1ED760',

  /** Transparent variants */
  accentAlpha25: 'rgba(30, 215, 96, 0.25)',
  accentAlpha10: 'rgba(30, 215, 96, 0.10)',
  accentAlpha15: 'rgba(30, 215, 96, 0.15)',
  violetAlpha25: 'rgba(255, 255, 255, 0.10)',
  violetAlpha10: 'rgba(255, 255, 255, 0.05)',
  backgroundAlpha80: 'rgba(18, 18, 18, 0.90)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screen: 16,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
  albumArt: 4,
  card: 8,
  pill: 9999,
} as const;

export const typography = {
  /** System fonts — Roboto on Android, SF Pro on iOS */
  fontFamily: undefined,
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hero: 40,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;

export const shadows = {
  /** Subtle ambient shadow without neon glow */
  emeraldGlow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  violetGlow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  neonButtonGlow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  lavenderGlow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  lavenderGlowIntense: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  floatingBar: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  playbackGlow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cyanGlow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
