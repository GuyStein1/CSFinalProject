import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, SegmentedButtons, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RequesterTabs from './RequesterTabs';
import FixerTabs from './FixerTabs';
import CreateTask from '../screens/CreateTask';
import TaskDetails from '../screens/TaskDetails';
import SettingsScreen from '../screens/SettingsScreen';
import AppLogo from '../components/AppLogo';
import { brandColors } from '../theme';

type Mode = 'requester' | 'fixer';

const Stack = createNativeStackNavigator();

function MainScreen() {
  const [mode, setMode] = useState<Mode>('requester');
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: theme.colors.primary,
          },
        ]}
      >
        <AppLogo compact onDark />
        <View style={styles.rightControls}>
          <SegmentedButtons
            value={mode}
            onValueChange={(v: string) => setMode(v as Mode)}
            density="small"
            buttons={[
              { value: 'requester', label: 'Requester' },
              { value: 'fixer', label: 'Fixer' },
            ]}
            style={styles.segmentedButtons}
            theme={{
              colors: {
                secondaryContainer: theme.colors.secondary,
                onSecondaryContainer: theme.colors.primary,
                outline: 'rgba(255, 252, 246, 0.25)',
                onSurface: 'rgba(255, 252, 246, 0.82)',
              },
            }}
          />
          <View style={styles.bellShell}>
            <IconButton
              icon="bell-outline"
              iconColor={theme.colors.onPrimary}
              size={20}
              onPress={() => {}}
              style={styles.bellButton}
            />
          </View>
        </View>
      </View>
      <View style={styles.tabContainer}>
        {mode === 'requester' ? <RequesterTabs /> : <FixerTabs />}
      </View>
    </View>
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
        headerTitleStyle: { color: brandColors.textPrimary },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainScreen}
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
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#132435',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentedButtons: {
    width: 168,
    backgroundColor: 'rgba(255, 252, 246, 0.08)',
    borderRadius: 999,
  },
  bellButton: {
    margin: 0,
  },
  bellShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 252, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flex: 1,
  },
});
