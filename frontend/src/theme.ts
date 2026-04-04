import { MD3LightTheme, configureFonts } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1A237E',        // Deep Navy Blue — buttons, active states, top bar
    onPrimary: '#FFFFFF',      // White text/icons on navy backgrounds
    secondary: '#FFC107',      // Golden Yellow — accents, highlights, FAB
    onSecondary: '#212121',    // Dark Gray text/icons on yellow backgrounds
    surface: '#F5F5F5',        // Light Gray — card backgrounds
    onSurface: '#212121',
    background: '#FFFFFF',
    onBackground: '#212121',
    error: '#B00020',
    onError: '#FFFFFF',
    outline: '#79747E',
    surfaceVariant: '#E7E0EC',
  },
  fonts: configureFonts({ config: { fontFamily: 'System' } }),
};

export type AppTheme = typeof theme;
