import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BottomTabHeaderProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, Text } from 'react-native-paper';
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
import { brandColors, spacing, radii, shadows, typography } from '../theme';

type Mode = 'requester' | 'fixer';

const Stack = createNativeStackNavigator();
const ModeTabs = createBottomTabNavigator();

function MainHeader({ navigation, route }: BottomTabHeaderProps) {
  const insets = useSafeAreaInsets();
  const mode: Mode = route.name === 'FixerMode' ? 'fixer' : 'requester';

  const handleModeChange = (value: Mode) => {
    const nextRoute = value === 'fixer' ? 'FixerMode' : 'RequesterMode';
    if (route.name !== nextRoute) {
      navigation.navigate(nextRoute);
    }
  };

  return (
    <LinearGradient
      colors={[brandColors.primaryDark, brandColors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}
    >
      <AppLogo compact onDark />

      <View style={styles.rightControls}>
        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => handleModeChange('requester')}
            style={[
              styles.modeButton,
              mode === 'requester' && styles.modeButtonActive,
            ]}
          >
            <MaterialCommunityIcons
              name="home-outline"
              size={15}
              color={mode === 'requester' ? brandColors.primary : 'rgba(255,252,246,0.7)'}
            />
            <Text
              style={[
                typography.buttonSm,
                {
                  color: mode === 'requester' ? brandColors.primary : 'rgba(255,252,246,0.7)',
                  fontSize: 12,
                },
              ]}
            >
              Requester
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleModeChange('fixer')}
            style={[
              styles.modeButton,
              mode === 'fixer' && styles.modeButtonActive,
            ]}
          >
            <MaterialCommunityIcons
              name="wrench-outline"
              size={15}
              color={mode === 'fixer' ? brandColors.primary : 'rgba(255,252,246,0.7)'}
            />
            <Text
              style={[
                typography.buttonSm,
                {
                  color: mode === 'fixer' ? brandColors.primary : 'rgba(255,252,246,0.7)',
                  fontSize: 12,
                },
              ]}
            >
              Fixer
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.bellShell}>
          <MaterialCommunityIcons
            name="bell-outline"
            size={20}
            color={brandColors.textOnDark}
          />
        </Pressable>
      </View>
    </LinearGradient>
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
      <ModeTabs.Screen
        name="RequesterMode"
        component={RequesterTabs}
        options={{ title: 'Requester' }}
      />
      <ModeTabs.Screen
        name="FixerMode"
        component={FixerTabs}
        options={{ title: 'Fixer' }}
      />
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
      <Stack.Screen
        name="Main"
        component={MainNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTask}
        options={{ title: 'Create Task' }}
      />
      <Stack.Screen
        name="TaskDetails"
        component={TaskDetails}
        options={{ title: 'Task Details' }}
      />
      <Stack.Screen
        name="TaskDetailsFixer"
        component={TaskDetailsFixer}
        options={{ title: 'Job Details' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
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
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 252, 246, 0.1)',
    borderRadius: radii.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 246, 0.12)',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  modeButtonActive: {
    backgroundColor: brandColors.secondary,
  },
  bellShell: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 252, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
