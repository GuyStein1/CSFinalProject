import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BottomTabHeaderProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import RequesterTabs from './RequesterTabs';
import FixerTabs from './FixerTabs';
import CreateTask from '../screens/CreateTask';
import TaskDetails from '../screens/TaskDetails';
import TaskDetailsFixer from '../screens/TaskDetailsFixer';
import SettingsScreen from '../screens/SettingsScreen';
import AppLogo from '../components/AppLogo';
import HamburgerMenu from '../components/HamburgerMenu';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

type Mode = 'requester' | 'fixer';

const Stack = createNativeStackNavigator();
const ModeTabs = createBottomTabNavigator();

function MainHeader({ navigation, route }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const mode: Mode = route.name === 'FixerMode' ? 'fixer' : 'requester';

  const handleModeChange = (value: Mode) => {
    const nextRoute = value === 'fixer' ? 'FixerMode' : 'RequesterMode';
    if (route.name !== nextRoute) navigation.navigate(nextRoute);
  };

  return (
    <>
      <LinearGradient
        colors={[brandColors.primaryDark, brandColors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}
      >
        {/* hamburger — left */}
        <Pressable style={styles.iconBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
          <MaterialCommunityIcons name="menu" size={24} color={brandColors.textOnDark} />
        </Pressable>

        {/* logo — absolutely centered */}
        <View style={styles.logoCenter} pointerEvents="none">
          <AppLogo compact onDark />
        </View>

        {/* bell — right */}
        <Pressable style={styles.iconBtn} hitSlop={8}>
          <MaterialCommunityIcons name="bell-outline" size={22} color={brandColors.textOnDark} />
        </Pressable>
      </LinearGradient>

      <HamburgerMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentMode={mode}
        onModeChange={handleModeChange}
        onSettingsPress={() => navigation.navigate('Settings' as never)}
      />
    </>
  );
}

function MainNavigator() {
  const theme = useTheme();

  return (
    <ModeTabs.Navigator
      initialRouteName="RequesterMode"
      screenOptions={{
        header: (props: BottomTabHeaderProps) => <MainHeader {...props} />,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <ModeTabs.Screen name="RequesterMode" component={RequesterTabs} options={{ title: 'Requester' }} />
      <ModeTabs.Screen name="FixerMode" component={FixerTabs} options={{ title: 'Fixer' }} />
    </ModeTabs.Navigator>
  );
}

export default function AppNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: theme.colors.primary,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { ...typography.h3, color: brandColors.textPrimary },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Main" component={MainNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="CreateTask" component={CreateTask} options={{ title: 'Create Task' }} />
      <Stack.Screen name="TaskDetails" component={TaskDetails} options={{ title: 'Task Details' }} />
      <Stack.Screen name="TaskDetailsFixer" component={TaskDetailsFixer} options={{ title: 'Job Details' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl,
    ...shadows.lg,
  },
  logoCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.md,
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,252,246,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
