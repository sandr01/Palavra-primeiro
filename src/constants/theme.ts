// src/constants/theme.ts

export const colors = {
  // Brand
  primary: '#7c3aed',
  primaryDark: '#4a1d7a',
  primaryDeep: '#2c1654',
  primaryLight: '#ede8f8',

  // Neutrals
  white: '#ffffff',
  background: '#f5f0eb',
  surface: '#ffffff',
  border: '#e8e0d8',

  // Text
  textPrimary: '#2c2030',
  textSecondary: '#5a4a6a',
  textMuted: '#9080a0',
  textOnDark: '#ffffff',
  textOnDarkMuted: '#c9b8e8',

  // Semantic
  success: '#2a7a2a',
  successBg: '#e8f5e8',
  danger: '#b91c1c',
  dangerBg: '#fce8e8',

  // Blocker overlay
  overlayStart: '#1a0a30',
  overlayEnd: '#4a1d7a',
} as const;

export const fonts = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#2c1654',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;
