import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import RequesterDashboard from '../screens/RequesterDashboard';
import RequesterTutorialScreen from '../screens/AppTutorialScreen';
import MyTasksScreen from '../screens/MyTasksScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ConversationListScreen from '../screens/ConversationListScreen';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { auth } from '../config/firebase';
import { brandColors, shadows, spacing } from '../theme';

const getRequesterTutorialKey = () => `requesterTutorialSeen_${auth.currentUser?.uid ?? 'anon'}`;

const Tab = createBottomTabNavigator();

function TabBarBackground() {
  return (
    <>
      <View style={[styles.modeStrip, { backgroundColor: brandColors.primary }]} />
    </>
  );
}

function TabIcon({ name, color, size, focused }: { name: string; color: string; size: number; focused: boolean }) {
  return (
    <View style={styles.tabIconWrapper}>
      <MaterialCommunityIcons name={name as never} color={color} size={size} />
      {focused && <View style={[styles.activeIndicator, { backgroundColor: color }]} />}
    </View>
  );
}

export default function RequesterTabs() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const useDesktopNavigation = Platform.OS === 'web' && width >= 900;
  const { unreadCount } = useUnreadMessages();
  const [tutorialState, setTutorialState] = useState<'checking' | 'show' | 'done'>('checking');

  useEffect(() => {
    AsyncStorage.getItem(getRequesterTutorialKey()).then((seen) => {
      setTutorialState(seen === 'true' ? 'done' : 'show');
    });
  }, []);

  const handleTutorialComplete = useCallback(async () => {
    await AsyncStorage.setItem(getRequesterTutorialKey(), 'true');
    await AsyncStorage.setItem('onboarding_nudge_dismissed', 'true');
    setTutorialState('done');
  }, []);

  if (tutorialState === 'checking') return null;

  if (tutorialState === 'show') {
    return <RequesterTutorialScreen onComplete={handleTutorialComplete} />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: brandColors.textMuted,
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarStyle: useDesktopNavigation ? styles.hiddenTabBar : styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: useDesktopNavigation ? undefined : () => <TabBarBackground />,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={RequesterDashboard}
        options={{
          tabBarLabel: t('nav.home'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MyTasks"
        component={MyTasksScreen}
        options={{
          tabBarLabel: t('nav.myTasks'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'clipboard-list' : 'clipboard-list-outline'} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ConversationListScreen}
        initialParams={{ mode: 'requester' }}
        options={{
          tabBarLabel: t('nav.messages'),
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: brandColors.primary, fontSize: 10, fontWeight: '700' },
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'chat' : 'chat-outline'} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('nav.account'),
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'account' : 'account-outline'} color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  hiddenTabBar: {
    display: 'none',
  },
  modeStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  tabBar: {
    height: 68,
    paddingTop: spacing.sm + 3,
    paddingBottom: spacing.sm + 2,
    borderTopWidth: 0,
    backgroundColor: brandColors.surface,
    ...shadows.md,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarItem: {
    gap: 2,
  },
  tabIconWrapper: {
    alignItems: 'center',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
});
