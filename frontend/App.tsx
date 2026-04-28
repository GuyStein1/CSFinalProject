import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import useAuthBootstrap from './src/hooks/useAuthBootstrap';
import { navigationTheme, theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';
import LandingScreen from './src/screens/LandingScreen';
import { NotificationProvider } from './src/context/NotificationContext';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import AccessibilityWidget from './src/components/AccessibilityWidget';
import GlobalCelebration from './src/components/GlobalCelebration';

type SignedOutSurface = 'landing' | 'login';

function RootContent() {
  const authState = useAuthBootstrap();
  const [signedOutSurface, setSignedOutSurface] = useState<SignedOutSurface>('landing');

  useEffect(() => {
    if (authState.status === 'ready' && signedOutSurface !== 'landing') {
      setSignedOutSurface('landing');
    }
  }, [authState.status, signedOutSurface]);

  if (Platform.OS === 'web' && authState.status === 'signed_out' && signedOutSurface === 'landing') {
    return (
      <LandingScreen
        isSignedIn={false}
        onLogin={() => setSignedOutSurface('login')}
        onPostTask={() => setSignedOutSurface('login')}
      />
    );
  }

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
        initialMode={signedOutSurface === 'login' ? 'login' : 'welcome'}
      />
    );
  }

  return (
    <NotificationProvider>
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
      <GlobalCelebration />
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
