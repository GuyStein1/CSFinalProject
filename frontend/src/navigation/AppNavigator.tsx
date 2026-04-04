import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, SegmentedButtons, Text, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import RequesterTabs from './RequesterTabs';
import FixerTabs from './FixerTabs';
import CreateTask from '../screens/CreateTask';
import TaskDetails from '../screens/TaskDetails';
import SettingsScreen from '../screens/SettingsScreen';

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
            paddingTop: insets.top + 4,
            backgroundColor: theme.colors.primary,
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons
            name="hammer-wrench"
            size={22}
            color={theme.colors.secondary}
          />
          <Text variant="titleMedium" style={[styles.logoText, { color: theme.colors.onPrimary }]}>
            Fixlt
          </Text>
        </View>
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
                outline: 'rgba(255,255,255,0.5)',
                onSurface: theme.colors.onPrimary,
              },
            }}
          />
          <IconButton
            icon="bell-outline"
            iconColor={theme.colors.onPrimary}
            size={22}
            onPress={() => {}}
            style={styles.bellButton}
          />
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
        contentStyle: { backgroundColor: '#E3F2FD' },
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
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontWeight: 'bold',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentedButtons: {
    width: 180,
  },
  bellButton: {
    margin: 0,
    marginLeft: 2,
  },
  tabContainer: {
    flex: 1,
  },
});
