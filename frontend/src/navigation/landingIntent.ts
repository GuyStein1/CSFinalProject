import type { ComponentType } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import type { Category } from '../constants/categories';

export type LandingIntent =
  | { kind: 'dashboard' }
  | { kind: 'postTask'; category?: Category }
  | { kind: 'requesterTasks' }
  | { kind: 'fixerWorkspace' }
  | { kind: 'fixerBids' }
  | { kind: 'fixerProfile' };

export type LandingAuthMode = 'login' | 'register';

export interface LandingIntentNavigation {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
}

export interface LandingScreenNavigationProps {
  isSignedIn?: boolean;
  onLogin?: () => void;
  onCreateAccount?: () => void;
  onDashboard?: () => void;
  onRequesterHome?: () => void;
  onRequesterTasks?: () => void;
  onPostTask: (category?: Category) => void;
  onCategoryPress?: (category: Category) => void;
  onCategorySelect?: (category: Category) => void;
  onBecomeFixer?: () => void;
  onFixerHome?: () => void;
  onFixerBids?: () => void;
  onFixerProfile?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
}

export type RootStackParamList = {
  Main:
    | {
        screen?: 'RequesterMode' | 'FixerMode';
        params?: {
          screen?: string;
          params?: Record<string, unknown>;
        };
      }
    | undefined;
  CreateTask: { category?: Category } | undefined;
  TaskDetails: { taskId?: string; openEdit?: boolean } | undefined;
  TaskDetailsFixer: { taskId?: string } | undefined;
  Settings: undefined;
  PublicProfile: { userId?: string } | undefined;
  NotificationCenter: undefined;
  BecomeFixerOnboarding: { returnScreen?: 'FindJobs' | 'MyBids' | 'FixerProfile' } | undefined;
  PastConversations: { mode?: string } | undefined;
  Chat: {
    taskId: string;
    myDbId?: string;
    recipientId?: string;
    recipientName?: string;
    recipientAvatar?: string | null;
    taskTitle?: string;
    taskStatus?: string;
  };
};

export function asLandingScreenWithNavigationProps<P>(
  LandingScreen: ComponentType<P>,
): ComponentType<LandingScreenNavigationProps> {
  return LandingScreen as unknown as ComponentType<LandingScreenNavigationProps>;
}

export function landingIntentForPostTask(category?: Category): LandingIntent {
  return category ? { kind: 'postTask', category } : { kind: 'postTask' };
}

export function routeLandingIntent(navigation: LandingIntentNavigation, intent: LandingIntent) {
  switch (intent.kind) {
    case 'postTask':
      navigation.navigate('CreateTask', intent.category ? { category: intent.category } : undefined);
      break;
    case 'fixerWorkspace':
      navigation.navigate('BecomeFixerOnboarding', { returnScreen: 'FindJobs' });
      break;
    case 'requesterTasks':
      navigation.navigate('Main', {
        screen: 'RequesterMode',
        params: { screen: 'MyTasks' },
      });
      break;
    case 'fixerBids':
      navigation.navigate('BecomeFixerOnboarding', { returnScreen: 'MyBids' });
      break;
    case 'fixerProfile':
      navigation.navigate('BecomeFixerOnboarding', { returnScreen: 'FixerProfile' });
      break;
    case 'dashboard':
    default:
      navigation.navigate('Main', {
        screen: 'RequesterMode',
        params: { screen: 'Dashboard' },
      });
      break;
  }
}

export function applyLandingIntent(
  navigation: NavigationContainerRef<RootStackParamList>,
  intent: LandingIntent,
) {
  if (intent.kind === 'postTask') {
    // Use reset so that Back from CreateTask always returns to Main (with tab bar),
    // not to an uninitialized or unexpected screen.
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          { name: 'CreateTask', params: intent.category ? { category: intent.category } : undefined },
        ],
      }),
    );
    return;
  }
  routeLandingIntent(
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate: (screen, params) => (navigation.navigate as any)(screen, params),
    },
    intent,
  );
}
