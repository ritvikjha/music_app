export const colors = {
  /** Deep OLED pitch-black primary background */
  background: '#050508',
  /** Elevated obsidian glass cards/surfaces */
  backgroundElevated: '#0E0E17',
  /** Inputs, chips, pressed surfaces */
  backgroundInput: '#151424',
  /** Card background with subtle contrast */
  backgroundCard: '#10101C',

  /** Electric Cyan accent — primary neon CTA, active states, progress fill */
  accent: '#00F2FE',
  /** Cyber Violet / Neon Purple — secondary glow and complementary highlights */
  accentSecondary: '#A855F7',
  neonViolet: '#A855F7',
  neonPink: '#F43F5E',

  /** Pressed/darker cyan variant */
  accentPressed: '#00C8D6',
  /** Soft cyan aura glow for active/playing states */
  accentGlow: '#38BDF8',

  /** Primary text — pure white */
  textPrimary: '#FFFFFF',
  /** Secondary text — cyber slate silver */
  textSecondary: '#94A3B8',

  /** Subtle luminous dividers and borders */
  divider: 'rgba(255, 255, 255, 0.08)',
  borderNeon: 'rgba(0, 242, 254, 0.22)',
  borderViolet: 'rgba(168, 85, 247, 0.22)',

  /** Destructive neon crimson */
  error: '#FF4D6D',

  /** Online cyber emerald indicator */
  online: '#10B981',

  /** Transparent variants */
  accentAlpha25: 'rgba(0, 242, 254, 0.25)',
  accentAlpha10: 'rgba(0, 242, 254, 0.10)',
  violetAlpha25: 'rgba(168, 85, 247, 0.25)',
  violetAlpha10: 'rgba(168, 85, 247, 0.10)',
  backgroundAlpha80: 'rgba(5, 5, 8, 0.85)',
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
  cyanGlow: {
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  violetGlow: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  neonButtonGlow: {
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
  // Compatibility aliases for existing components
  lavenderGlow: {
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  lavenderGlowIntense: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 12,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
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
