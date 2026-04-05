import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { MD3LightTheme, configureFonts } from 'react-native-paper';

export const brandColors = {
  primary: '#1C3C56',
  primaryMuted: '#496B84',
  secondary: '#F1B545',
  background: '#F5F1E8',
  surface: '#FFFCF6',
  surfaceAlt: '#E9E2D5',
  outline: '#C9BEAF',
  textPrimary: '#243746',
  textMuted: '#66727B',
  success: '#517A58',
  successSoft: '#E5EFE6',
  warning: '#9B6D2A',
  warningSoft: '#F5E7C7',
  danger: '#A85B5B',
  dangerSoft: '#F5E2E0',
  infoSoft: '#DDE7EE',
  neutralSoft: '#ECE6DD',
};

export const theme = {
  ...MD3LightTheme,
  roundness: 18,
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
