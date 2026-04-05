import React, { useCallback, useState } from 'react';
import { Pressable, View, StyleSheet, RefreshControl, ScrollView, Alert, Platform } from 'react-native';
import { FAB } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import { FSectionHeader } from '../components/ui';
import { brandColors, spacing, shadows, radii } from '../theme';

type Category = 'ASSEMBLY' | 'MOUNTING' | 'MOVING' | 'PAINTING' | 'PLUMBING' | 'ELECTRICITY' | 'OUTDOORS' | 'CLEANING';

interface Task {
  id: string;
  title: string;
  category: Category;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  suggested_price: number | null;
  general_location_name: string;
  bid_count?: number;
  assigned_fixer_name?: string;
  created_at: string;
}

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export default function MyTasksScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/api/users/me/tasks', { params: { limit: 50 } });
      setTasks(res.data.tasks);
    } catch {
      // TODO: error handling
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  // ── Action handlers ──────────────────────────────────────────────

  const webConfirm = (msg: string): boolean => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      return confirm(msg);
    }
    return true;
  };

  const deleteTask = (taskId: string) => {
    const doDelete = async () => {
      try {
        await api.delete(`/api/tasks/${taskId}`);
        fetchTasks();
      } catch {
        Alert.alert('Error', 'Failed to delete task.');
      }
    };

    if (Platform.OS === 'web') {
      if (webConfirm('Delete this task permanently? This cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete Task', 'Delete this task permanently? This cannot be undone.', [
        { text: 'Cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const cancelTask = (taskId: string) => {
    const doCancel = async () => {
      try {
        await api.put(`/api/tasks/${taskId}/status`, { status: 'CANCELED' });
        fetchTasks();
      } catch {
        Alert.alert('Error', 'Failed to cancel task.');
      }
    };

    if (Platform.OS === 'web') {
      if (webConfirm('Are you sure you want to cancel this task?')) doCancel();
    } else {
      Alert.alert('Cancel Task', 'Are you sure you want to cancel this task?', [
        { text: 'No' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  const markCompleted = (taskId: string) => {
    const doComplete = async () => {
      try {
        await api.put(`/api/tasks/${taskId}/status`, { status: 'COMPLETED' });
        navigation.navigate('TaskDetails', { taskId });
      } catch {
        Alert.alert('Error', 'Failed to mark task as completed.');
      }
    };

    if (Platform.OS === 'web') {
      if (webConfirm('Mark this task as completed?')) doComplete();
    } else {
      doComplete();
    }
  };

  const reactivateTask = (taskId: string) => {
    const doReactivate = async () => {
      try {
        await api.put(`/api/tasks/${taskId}/status`, { status: 'OPEN' });
        fetchTasks();
      } catch {
        Alert.alert('Error', 'Failed to reactivate task.');
      }
    };

    if (Platform.OS === 'web') {
      const wantsEdit = webConfirm(
        'Would you like to edit this task before reactivating?\n\nOK — Yes, edit first\nCancel — No, reactivate as-is'
      );
      if (wantsEdit) {
        doReactivate().then(() => navigation.navigate('TaskDetails', { taskId, openEdit: true }));
      } else {
        doReactivate();
      }
    } else {
      Alert.alert('Reactivate Task', 'Reactivate this task?', [
        { text: 'Cancel' },
        {
          text: 'Reactivate',
          onPress: () => {
            Alert.alert('Edit first?', 'Would you like to edit the task before reactivating?', [
              { text: 'Reactivate as-is', onPress: doReactivate },
              {
                text: 'Edit first',
                onPress: async () => {
                  await doReactivate();
                  navigation.navigate('TaskDetails', { taskId, openEdit: true });
                },
              },
            ]);
          },
        },
      ]);
    }
  };

  // ── Sorting: IN_PROGRESS first, then by bid count ────────────────

  const activeTasks = tasks
    .filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
    .sort((a, b) => {
      if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
      if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1;
      return (b.bid_count || 0) - (a.bid_count || 0);
    });

  const pastTasks = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELED');

  if (loading) return <LoadingScreen label="Loading your tasks..." />;

  if (tasks.length === 0) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon="clipboard-text-outline"
          title="No tasks yet"
          message="Post your first task and get help today!"
          actionLabel="Create Task"
          onAction={() => navigation.navigate('CreateTask')}
        />
        <FAB
          icon="plus"
          style={styles.fab}
          color={brandColors.textPrimary}
          onPress={() => navigation.navigate('CreateTask')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTasks.length > 0 && (
          <View style={styles.section}>
            <FSectionHeader title="Active Tasks" count={activeTasks.length} />
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                title={task.title}
                category={task.category}
                status={task.status}
                suggestedPrice={task.suggested_price}
                locationName={task.general_location_name}
                bidCount={task.bid_count}
                fixerName={task.assigned_fixer_name}
                onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
                onCancel={() => cancelTask(task.id)}
                onEdit={task.status === 'OPEN' ? () => navigation.navigate('TaskDetails', { taskId: task.id, openEdit: true }) : undefined}
                onMarkCompleted={task.status === 'IN_PROGRESS' ? () => markCompleted(task.id) : undefined}
              />
            ))}
          </View>
        )}

        {pastTasks.length > 0 && (
          <View style={styles.section}>
            <FSectionHeader title="Past Tasks" count={pastTasks.length} muted />
            {pastTasks.map((task) => (
              <View key={task.id} style={styles.taskRow}>
                <View style={styles.taskCardWrap}>
                  <TaskCard
                    title={task.title}
                    category={task.category}
                    status={task.status}
                    suggestedPrice={task.suggested_price}
                    locationName={task.general_location_name}
                    onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
                    onReactivate={task.status === 'CANCELED' ? () => reactivateTask(task.id) : undefined}
                    muted
                  />
                </View>
                <Pressable
                  style={styles.trashBtn}
                  hitSlop={8}
                  onPress={() => deleteTask(task.id)}
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color={brandColors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        color={brandColors.textPrimary}
        onPress={() => navigation.navigate('CreateTask')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  scroll: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCardWrap: {
    flex: 1,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: 18,
    backgroundColor: brandColors.secondary,
    ...shadows.lg,
  },
});
