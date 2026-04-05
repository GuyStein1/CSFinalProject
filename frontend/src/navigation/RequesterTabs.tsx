import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import RequesterDashboard from '../screens/RequesterDashboard';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { brandColors } from '../theme';

const Tab = createBottomTabNavigator();

function MessagesScreen() {
  return <PlaceholderScreen title="Messages" />;
}

export default function RequesterTabs() {
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
        name="Dashboard"
        component={RequesterDashboard}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
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
