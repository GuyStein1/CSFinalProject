import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import DiscoveryFeedScreen from '../screens/DiscoveryFeedScreen';
import MyBidsScreen from '../screens/MyBidsScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import { glassText } from '../theme';

const Tab = createBottomTabNavigator();

function MessagesScreen() {
  return <PlaceholderScreen title="Messages" />;
}

function FixerProfileScreen() {
  return <PlaceholderScreen title="Fixer Profile" />;
}

export default function FixerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: styles.tabBarOuter,
        tabBarActiveTintColor: glassText.amber,
        tabBarInactiveTintColor: glassText.muted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => (
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
            <BlurView intensity={0} style={styles.tabBarBorderLine} />
          </BlurView>
        ),
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
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabBarBorderLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
