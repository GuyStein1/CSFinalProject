import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useAuthBootstrap from './src/hooks/useAuthBootstrap';
import { navigationTheme, theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';
import { NotificationProvider } from './src/context/NotificationContext';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import AccessibilityWidget from './src/components/AccessibilityWidget';

function RootContent() {
  const authState = useAuthBootstrap();

  if (authState.status !== 'ready') {
    return (
      <AuthScreen
        status={authState.status}
        error={authState.error}
        userEmail={authState.userEmail}
        suggestedFullName={authState.suggestedFullName}
        onSignIn={authState.signIn}
        onSyncLocalAccount={authState.syncLocalAccount}
        onRetry={authState.retry}
        onLogOut={authState.logOut}
      />
    );
  }

  return (
    <NotificationProvider>
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AccessibilityProvider>
          <RootContent />
          <AccessibilityWidget />
        </AccessibilityProvider>
        <StatusBar style="light" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
