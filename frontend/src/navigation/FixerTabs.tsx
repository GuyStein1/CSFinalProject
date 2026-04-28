import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import DiscoveryFeedScreen from '../screens/DiscoveryFeedScreen';
import MyBidsScreen from '../screens/MyBidsScreen';
import FixerProfileScreen from '../screens/FixerProfileScreen';
import { brandColors, shadows, spacing } from '../theme';

const Tab = createBottomTabNavigator();

function TabBarBackground() {
  return <View style={[styles.modeStrip, { backgroundColor: brandColors.secondary }]} />;
}

function TabIcon({ name, color, size, focused }: { name: string; color: string; size: number; focused: boolean }) {
  return (
    <View style={styles.tabIconWrapper}>
      <MaterialCommunityIcons name={name as never} color={color} size={size} />
      {focused && <View style={[styles.activeIndicator, { backgroundColor: color }]} />}
    </View>
  );
}

export default function FixerTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: brandColors.secondaryDark,
        tabBarInactiveTintColor: brandColors.textMuted,
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () => <TabBarBackground />,
      }}
    >
      <Tab.Screen
        name="FindJobs"
        component={DiscoveryFeedScreen}
        options={{
          tabBarLabel: 'Find Jobs',
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <TabIcon name={focused ? 'map-search' : 'map-search-outline'} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="MyBids"
        component={MyBidsScreen}
        options={{
          tabBarLabel: 'My Bids',
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <TabIcon name={focused ? 'format-list-bulleted' : 'format-list-bulleted'} color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="FixerProfile"
        component={FixerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
            <TabIcon name={focused ? 'account' : 'account-outline'} color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
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
