import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import RequesterDashboard from '../screens/RequesterDashboard';
import MyTasksScreen from '../screens/MyTasksScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ConversationListScreen from '../screens/ConversationListScreen';
import { brandColors, shadows, spacing } from '../theme';

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
  const { width } = useWindowDimensions();
  const useDesktopNavigation = Platform.OS === 'web' && width >= 900;

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
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MyTasks"
        component={MyTasksScreen}
        options={{
          tabBarLabel: 'My Tasks',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'clipboard-list' : 'clipboard-list-outline'} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={ConversationListScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name={focused ? 'chat' : 'chat-outline'} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Account',
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
