export const colors = {
  /** Near-black, slightly cool — primary background */
  background: '#0A0A0F',
  /** Elevated cards/surfaces */
  backgroundElevated: '#16151C',
  /** Inputs, pressed states */
  backgroundInput: '#1F1E28',

  /** Lavender accent — CTAs, active states, progress bar fill */
  accent: '#B8A6E0',
  /** Pressed/darker lavender variant */
  accentPressed: '#9A85C9',
  /** Soft lavender glow for active/playing states */
  accentGlow: '#D4C8F0',

  /** Primary text — off-white */
  textPrimary: '#F2F0F7',
  /** Secondary/muted text — artist names, timestamps */
  textSecondary: '#9C98A8',

  /** Dividers and subtle borders */
  divider: '#2A2833',

  /** Error/destructive — muted, tonal */
  error: '#E08A8A',

  /** Online indicator green */
  online: '#7ECC8B',

  /** Transparent variants */
  accentAlpha25: 'rgba(184, 166, 224, 0.25)',
  accentAlpha10: 'rgba(184, 166, 224, 0.10)',
  backgroundAlpha80: 'rgba(10, 10, 15, 0.80)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  /** Use system fonts — Roboto on Android, SF Pro on iOS */
  fontFamily: undefined, // Let RN use platform defaults
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
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
  },
} as const;

export const shadows = {
  lavenderGlow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  lavenderGlowIntense: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
