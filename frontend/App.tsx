import './src/i18n';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef, type LinkingOptions } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import useAuthBootstrap from './src/hooks/useAuthBootstrap';
import { navigationTheme, theme } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';
import AuthScreen from './src/screens/AuthScreen';
import LandingScreen from './src/screens/LandingScreen';
import { NotificationProvider } from './src/context/NotificationContext';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AccessibilityWidget from './src/components/AccessibilityWidget';
import GlobalCelebration from './src/components/GlobalCelebration';
import OnboardingNudge from './src/components/OnboardingNudge';
import LoadingScreen from './src/components/LoadingScreen';
import {
  applyLandingIntent,
  asLandingScreenWithNavigationProps,
  landingIntentForPostTask,
  type LandingAuthMode,
  type LandingIntent,
  type RootStackParamList,
} from './src/navigation/landingIntent';

type SignedOutSurface = 'landing' | 'auth';

const USE_SIGNED_OUT_LANDING = Platform.OS === 'web';
const DEFAULT_SIGNED_OUT_SURFACE: SignedOutSurface = USE_SIGNED_OUT_LANDING ? 'landing' : 'auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const linking: LinkingOptions<any> = {
  prefixes: [typeof window !== 'undefined' ? window.location.origin : ''],
  config: {
    screens: {
      Main: {
        path: '',
        screens: {
          RequesterMode: {
            path: 'requester',
            screens: {
              Dashboard: 'dashboard',
              MyTasks: 'my-tasks',
              Messages: 'messages',
              Profile: 'profile',
            },
          },
          FixerMode: {
            path: 'fixer',
            screens: {
              FindJobs: 'find-jobs',
              MyBids: 'my-bids',
              Messages: 'messages',
              FixerProfile: 'profile',
            },
          },
        },
      },
      CreateTask: 'create-task',
      TaskDetails: {
        path: 'task/:taskId',
      },
      TaskDetailsFixer: {
        path: 'job/:taskId',
      },
      Settings: 'settings',
      PublicProfile: {
        path: 'user/:userId',
      },
      NotificationCenter: 'notifications',
      BecomeFixerOnboarding: 'become-fixer',
      PastConversations: 'past-conversations',
      Chat: {
        path: 'chat/:taskId',
      },
    },
  },
};

const LandingScreenWithNavigationProps = asLandingScreenWithNavigationProps(LandingScreen);

function RootContent() {
  const authState = useAuthBootstrap();
  const [signedOutSurface, setSignedOutSurface] = useState<SignedOutSurface>(DEFAULT_SIGNED_OUT_SURFACE);
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
    setSignedOutSurface(DEFAULT_SIGNED_OUT_SURFACE);
  }, [authState.status, navigationReady, navigationRef, pendingLandingIntent]);

  const requireAuth = useCallback((mode: LandingAuthMode, intent: LandingIntent = { kind: 'dashboard' }) => {
    setPendingLandingIntent(intent);
    setAuthMode(mode);
    setSignedOutSurface('auth');
    // Push a history entry so the browser Back button returns to the landing
    // page instead of leaving the site (the landing ↔ auth switch is React
    // state, not navigation, so the browser knows nothing about it).
    if (USE_SIGNED_OUT_LANDING && typeof window !== 'undefined') {
      window.history.pushState({ fixitSurface: 'auth' }, '');
    }
  }, []);

  useEffect(() => {
    if (
      !USE_SIGNED_OUT_LANDING ||
      typeof window === 'undefined' ||
      authState.status !== 'signed_out' ||
      signedOutSurface !== 'auth'
    ) {
      return;
    }
    const handlePopState = () => {
      setPendingLandingIntent(null);
      setAuthMode('login');
      setSignedOutSurface('landing');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authState.status, signedOutSurface]);

  const handleAuthLogOut = useCallback(async () => {
    setPendingLandingIntent(null);
    setAuthMode('login');
    setSignedOutSurface(DEFAULT_SIGNED_OUT_SURFACE);
    await authState.logOut();
  }, [authState.logOut]);

  if (USE_SIGNED_OUT_LANDING && authState.status === 'signed_out' && signedOutSurface === 'landing') {
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

  // On web, show the standard loading screen while auth is checking so the user
  // doesn't see a flash of the AuthScreen before the landing page appears.
  if (USE_SIGNED_OUT_LANDING && authState.status === 'checking') {
    return <LoadingScreen />;
  }

  const authInitialMode: LandingAuthMode | 'welcome' = USE_SIGNED_OUT_LANDING
    ? signedOutSurface === 'auth' ? authMode : 'welcome'
    : 'login';

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
        initialMode={authInitialMode}
      />
    );
  }

  if (authState.isAdmin) {
    return (
      <NavigationContainer theme={navigationTheme}>
        <AdminNavigator />
      </NavigationContainer>
    );
  }

  return (
    <NotificationProvider>
      <NavigationContainer
        ref={navigationRef}
        linking={Platform.OS === 'web' ? linking : undefined}
        theme={navigationTheme}
        onReady={() => setNavigationReady(true)}
      >
        <AppNavigator />
        <OnboardingNudge />
      </NavigationContainer>
      <GlobalCelebration />
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <LanguageProvider>
          <AccessibilityProvider>
            <RootContent />
            <AccessibilityWidget />
          </AccessibilityProvider>
        </LanguageProvider>
        <StatusBar style="light" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
