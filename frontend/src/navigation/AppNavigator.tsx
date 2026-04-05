import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  BottomTabHeaderProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, SegmentedButtons, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import RequesterTabs from './RequesterTabs';
import FixerTabs from './FixerTabs';
import CreateTask from '../screens/CreateTask';
import TaskDetails from '../screens/TaskDetails';
import TaskDetailsFixer from '../screens/TaskDetailsFixer';
import SettingsScreen from '../screens/SettingsScreen';
import AppLogo from '../components/AppLogo';
import { brandColors, glassText } from '../theme';

type Mode = 'requester' | 'fixer';

const Stack = createNativeStackNavigator();
const ModeTabs = createBottomTabNavigator();
const { width: SW, height: SH } = Dimensions.get('screen');

// ── Global glass background ──────────────────────────────────────────────────
function GlassBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0F2336' }]} />
      {/* amber orb — top right */}
      <LinearGradient
        colors={['rgba(241,181,69,0.55)', 'rgba(241,181,69,0)']}
        style={[styles.orb, styles.orbTopRight]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
      />
      {/* navy-teal orb — bottom left */}
      <LinearGradient
        colors={['rgba(73,107,132,0.65)', 'rgba(73,107,132,0)']}
        style={[styles.orb, styles.orbBottomLeft]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0, y: 0 }}
      />
    </View>
  );
}

// ── Glass header ─────────────────────────────────────────────────────────────
function MainHeader({ navigation, route }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const mode: Mode = route.name === 'FixerMode' ? 'fixer' : 'requester';

  const handleModeChange = (value: string) => {
    const nextRoute = value === 'fixer' ? 'FixerMode' : 'RequesterMode';
    if (route.name !== nextRoute) navigation.navigate(nextRoute);
  };

  return (
    <BlurView
      intensity={55}
      tint="dark"
      style={[styles.topBar, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.topBarBorder} />
      <AppLogo compact onDark />
      <View style={styles.rightControls}>
        <SegmentedButtons
          value={mode}
          onValueChange={handleModeChange}
          density="small"
          buttons={[
            { value: 'requester', label: 'Requester' },
            { value: 'fixer', label: 'Fixer' },
          ]}
          style={styles.segmentedButtons}
          theme={{
            colors: {
              secondaryContainer: brandColors.secondary,
              onSecondaryContainer: brandColors.primary,
              outline: 'rgba(255,252,246,0.22)',
              onSurface: 'rgba(255,252,246,0.78)',
            },
          }}
        />
        <View style={styles.bellShell}>
          <IconButton
            icon="bell-outline"
            iconColor={glassText.primary}
            size={20}
            onPress={() => {}}
            style={styles.bellButton}
          />
        </View>
      </View>
    </BlurView>
  );
}

function MainNavigator() {
  return (
    <ModeTabs.Navigator
      initialRouteName="RequesterMode"
      screenOptions={{
        header: (props: BottomTabHeaderProps) => <MainHeader {...props} />,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <ModeTabs.Screen name="RequesterMode" component={RequesterTabs} />
      <ModeTabs.Screen name="FixerMode" component={FixerTabs} />
    </ModeTabs.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <GlassBackground />
      <Stack.Navigator
        screenOptions={{
          headerTintColor: brandColors.primary,
          headerStyle: { backgroundColor: brandColors.surface },
          headerShadowVisible: false,
          headerTitleStyle: { color: brandColors.textPrimary },
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="CreateTask" component={CreateTask} options={{ title: 'Create Task' }} />
        <Stack.Screen name="TaskDetails" component={TaskDetails} options={{ title: 'Task Details' }} />
        <Stack.Screen name="TaskDetailsFixer" component={TaskDetailsFixer} options={{ title: 'Job Details' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbTopRight: {
    width: SW * 0.85,
    height: SW * 0.85,
    top: -SW * 0.2,
    right: -SW * 0.25,
  },
  orbBottomLeft: {
    width: SW * 0.7,
    height: SW * 0.7,
    bottom: SH * 0.05,
    left: -SW * 0.2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  topBarBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentedButtons: {
    width: 168,
    backgroundColor: 'rgba(255,252,246,0.08)',
    borderRadius: 999,
  },
  bellButton: {
    margin: 0,
  },
  bellShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,252,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
