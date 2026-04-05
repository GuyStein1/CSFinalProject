import React, { useCallback, useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { FAB } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import { FSectionHeader } from '../components/ui';
import { brandColors, spacing, shadows } from '../theme';

type Category = 'ELECTRICITY' | 'PLUMBING' | 'CARPENTRY' | 'PAINTING' | 'MOVING' | 'GENERAL';

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

  const activeTasks = tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
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
              />
            ))}
          </View>
        )}

        {pastTasks.length > 0 && (
          <View style={styles.section}>
            <FSectionHeader title="Past Tasks" count={pastTasks.length} muted />
            {pastTasks.map((task) => (
              <TaskCard
                key={task.id}
                title={task.title}
                category={task.category}
                status={task.status}
                suggestedPrice={task.suggested_price}
                locationName={task.general_location_name}
                onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
              />
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: 18,
    backgroundColor: brandColors.secondary,
    ...shadows.lg,
  },
});
