/**
 * luma design tokens: warm gold on cream.
 *
 * Hex values are a first pass at the deck mockups' palette. If the deck uses
 * different values, change them here only; every screen reads from these tokens.
 * `src/constants/__tests__/theme.test.ts` checks text/background contrast, so
 * re-run tests after changing a color.
 */

import { Platform } from 'react-native';

export const Palette = {
  cream50: '#FFFDF8',
  cream100: '#FBF6EC',
  cream200: '#F4EBD8',
  cream300: '#E8DCC2',
  gold300: '#E9CF8E',
  gold400: '#D9B45A',
  gold500: '#C99A2E',
  gold600: '#9C7413',
  gold700: '#7A5A0E',
  ink900: '#2A241C',
  ink700: '#4A4237',
  ink500: '#6B6152',
  night900: '#16130F',
  night800: '#211D17',
  night700: '#2E2920',
  night600: '#433B2E',
  sand100: '#F6EFE2',
  sand300: '#BFB3A0',
  sage600: '#3F7A52',
  sage300: '#8CC29C',
  clay600: '#B4462F',
  clay300: '#EE9B85',
} as const;

export const Colors = {
  light: {
    background: Palette.cream100,
    surface: Palette.cream50,
    surfaceMuted: Palette.cream200,
    border: Palette.cream300,
    text: Palette.ink900,
    textSecondary: Palette.ink500,
    primary: Palette.gold500,
    primaryPressed: Palette.gold400,
    onPrimary: Palette.ink900,
    accentText: Palette.gold700,
    chip: Palette.gold300,
    onChip: Palette.ink900,
    success: Palette.sage600,
    danger: Palette.clay600,
  },
  dark: {
    background: Palette.night900,
    surface: Palette.night800,
    surfaceMuted: Palette.night700,
    border: Palette.night600,
    text: Palette.sand100,
    textSecondary: Palette.sand300,
    primary: Palette.gold400,
    primaryPressed: Palette.gold500,
    onPrimary: Palette.night900,
    accentText: Palette.gold300,
    chip: Palette.night700,
    onChip: Palette.gold300,
    success: Palette.sage300,
    danger: Palette.clay300,
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
  },
});

export const Typography = {
  display: { fontFamily: Fonts.serif, fontSize: 36, lineHeight: 42, fontWeight: '600' },
  title: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 32, fontWeight: '600' },
  heading: { fontFamily: Fonts.sans, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

export type TypographyVariant = keyof typeof Typography;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const MaxContentWidth = 560;
