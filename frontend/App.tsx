import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState } from 'react';
import useAuthBootstrap from './src/hooks/useAuthBootstrap';
import { navigationTheme, theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';
import LandingScreen from './src/screens/LandingScreen';
import { NotificationProvider } from './src/context/NotificationContext';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import AccessibilityWidget from './src/components/AccessibilityWidget';
import GlobalCelebration from './src/components/GlobalCelebration';
import {
  applyLandingIntent,
  asLandingScreenWithNavigationProps,
  landingIntentForPostTask,
  type LandingAuthMode,
  type LandingIntent,
  type RootStackParamList,
} from './src/navigation/landingIntent';

type SignedOutSurface = 'landing' | 'auth';

const LandingScreenWithNavigationProps = asLandingScreenWithNavigationProps(LandingScreen);

function RootContent() {
  const authState = useAuthBootstrap();
  const [signedOutSurface, setSignedOutSurface] = useState<SignedOutSurface>('landing');
  const [authMode, setAuthMode] = useState<LandingAuthMode>('login');
  const [pendingLandingIntent, setPendingLandingIntent] = useState<LandingIntent | null>(null);
  const [navigationReady, setNavigationReady] = useState(false);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  useEffect(() => {
    if (authState.status !== 'ready' && navigationReady) {
      setNavigationReady(false);
    }
  }, [authState.status, navigationReady]);

  useEffect(() => {
    if (
      authState.status !== 'ready' ||
      !pendingLandingIntent ||
      !navigationReady ||
      !navigationRef.isReady()
    ) {
      return;
    }

    applyLandingIntent(navigationRef, pendingLandingIntent);
    setPendingLandingIntent(null);
    setSignedOutSurface('landing');
  }, [authState.status, navigationReady, navigationRef, pendingLandingIntent]);

  const requireAuth = useCallback((mode: LandingAuthMode, intent: LandingIntent = { kind: 'dashboard' }) => {
    setPendingLandingIntent(intent);
    setAuthMode(mode);
    setSignedOutSurface('auth');
  }, []);

  const handleAuthLogOut = useCallback(async () => {
    setPendingLandingIntent(null);
    setSignedOutSurface('landing');
    await authState.logOut();
  }, [authState.logOut]);

  if (authState.status === 'signed_out' && signedOutSurface === 'landing') {
    return (
      <LandingScreenWithNavigationProps
        isSignedIn={false}
        onLogin={() => requireAuth('login')}
        onCreateAccount={() => requireAuth('register')}
        onDashboard={() => requireAuth('login')}
        onRequesterHome={() => requireAuth('login', { kind: 'dashboard' })}
        onRequesterTasks={() => requireAuth('login', { kind: 'requesterTasks' })}
        onPostTask={(category) => requireAuth('login', landingIntentForPostTask(category))}
        onCategoryPress={(category) => requireAuth('login', landingIntentForPostTask(category))}
        onCategorySelect={(category) => requireAuth('login', landingIntentForPostTask(category))}
        onBecomeFixer={() => requireAuth('login', { kind: 'fixerWorkspace' })}
        onFixerHome={() => requireAuth('login', { kind: 'fixerWorkspace' })}
        onFixerBids={() => requireAuth('login', { kind: 'fixerBids' })}
        onFixerProfile={() => requireAuth('login', { kind: 'fixerProfile' })}
        onNotifications={() => requireAuth('login')}
        onProfile={() => requireAuth('login')}
        onSettings={() => requireAuth('login')}
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
        onLogOut={handleAuthLogOut}
        initialMode={signedOutSurface === 'auth' ? authMode : 'welcome'}
      />
    );
  }

  return (
    <NotificationProvider>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        onReady={() => setNavigationReady(true)}
      >
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
