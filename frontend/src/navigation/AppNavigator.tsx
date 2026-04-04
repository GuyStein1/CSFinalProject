import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme, SegmentedButtons, Text, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
            paddingTop: insets.top + 8,
            backgroundColor: theme.colors.primary,
          },
        ]}
      >
        <Text variant="titleLarge" style={[styles.logo, { color: theme.colors.onPrimary }]}>
          Fixlt
        </Text>
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
              secondaryContainer: theme.colors.onPrimary,
              onSecondaryContainer: theme.colors.primary,
              outline: theme.colors.onPrimary,
            },
          }}
        />
        <IconButton
          icon="bell-outline"
          iconColor={theme.colors.onPrimary}
          size={24}
          onPress={() => {}}
          style={styles.bellButton}
        />
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
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  logo: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  segmentedButtons: {
    flex: 1,
    marginHorizontal: 4,
  },
  bellButton: {
    margin: 0,
  },
  tabContainer: {
    flex: 1,
  },
});
