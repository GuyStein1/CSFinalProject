import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import DiscoveryFeedScreen from '../screens/DiscoveryFeedScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import { brandColors } from '../theme';

const Tab = createBottomTabNavigator();

function MyBidsScreen() {
  return <PlaceholderScreen title="My Bids" />;
}

function MessagesScreen() {
  return <PlaceholderScreen title="Messages" />;
}

function FixerProfileScreen() {
  return <PlaceholderScreen title="Fixer Profile" />;
}

export default function FixerTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: brandColors.textMuted,
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="FindJobs"
        component={DiscoveryFeedScreen}
        options={{
          tabBarLabel: 'Find Jobs',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="map-search" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MyBids"
        component={MyBidsScreen}
        options={{
          tabBarLabel: 'My Bids',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="format-list-bulleted" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="chat" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="FixerProfile"
        component={FixerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: brandColors.outline,
    backgroundColor: brandColors.surface,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
