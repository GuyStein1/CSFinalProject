import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import RequesterTabs from './RequesterTabs';
import CreateTask from '../screens/CreateTask';
import TaskDetails from '../screens/TaskDetails';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

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
        component={RequesterTabs}
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
