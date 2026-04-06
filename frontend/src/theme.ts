import { Platform, TextStyle, ViewStyle } from 'react-native';
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { MD3LightTheme, configureFonts } from 'react-native-paper';

export const brandColors = {
  primary: '#1C3C56',
  primaryLight: '#2A5478',
  primaryDark: '#0F2438',
  primaryMuted: '#496B84',
  secondary: '#F1B545',
  secondaryLight: '#F7CF7A',
  secondaryDark: '#D49A2A',
  background: '#F5F1E8',
  surface: '#FFFCF6',
  surfaceAlt: '#E9E2D5',
  surfaceElevated: '#FFFFFF',
  outline: '#C9BEAF',
  outlineLight: '#DDD6CB',
  textPrimary: '#243746',
  textSecondary: '#3D5467',
  textMuted: '#66727B',
  textOnDark: '#FFFCF6',
  textOnDarkMuted: 'rgba(255, 252, 246, 0.65)',
  success: '#517A58',
  successSoft: '#E5EFE6',
  warning: '#9B6D2A',
  warningSoft: '#F5E7C7',
  danger: '#A85B5B',
  dangerSoft: '#F5E2E0',
  infoSoft: '#DDE7EE',
  neutralSoft: '#ECE6DD',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 36, 56, 0.45)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radii = {
  sharp: 0,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  pill: 999,
} as const;

type ShadowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export const shadows: Record<'sm' | 'md' | 'lg', ShadowStyle> = Platform.select({
  ios: {
    sm: { shadowColor: '#112336', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: '#112336', shadowOffset: { width: 1, height: 5 }, shadowOpacity: 0.11, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: '#112336', shadowOffset: { width: 2, height: 10 }, shadowOpacity: 0.15, shadowRadius: 28, elevation: 8 },
  },
  android: {
    sm: { shadowColor: '#112336', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 2 },
    md: { shadowColor: '#112336', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 4 },
    lg: { shadowColor: '#112336', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 8 },
  },
  default: {
    sm: { shadowColor: '#112336', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: '#112336', shadowOffset: { width: 1, height: 5 }, shadowOpacity: 0.11, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: '#112336', shadowOffset: { width: 2, height: 10 }, shadowOpacity: 0.15, shadowRadius: 28, elevation: 8 },
  },
})!;

export const typography: Record<string, TextStyle> = {
  hero: { fontSize: 32, fontWeight: '800', lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontSize: 26, fontWeight: '700', lineHeight: 34, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  h3: { fontSize: 17, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyMedium: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.2 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18, letterSpacing: 0.3 },
  button: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  buttonSm: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  eyebrow: { fontSize: 11, fontWeight: '700', lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
};

export const theme = {
  ...MD3LightTheme,
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.primary,
    onPrimary: '#FFFCF6',
    secondary: brandColors.secondary,
    onSecondary: brandColors.textPrimary,
    background: brandColors.background,
    onBackground: brandColors.textPrimary,
    surface: brandColors.surface,
    onSurface: brandColors.textPrimary,
    surfaceVariant: brandColors.surfaceAlt,
    onSurfaceVariant: brandColors.textMuted,
    outline: brandColors.outline,
    error: brandColors.danger,
    onError: '#FFFFFF',
  },
  fonts: configureFonts({ config: { fontFamily: 'System' } }),
};

export const navigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: brandColors.primary,
    background: brandColors.background,
    card: brandColors.surface,
    text: brandColors.textPrimary,
    border: brandColors.outline,
    notification: brandColors.secondary,
  },
};

export type AppTheme = typeof theme;
