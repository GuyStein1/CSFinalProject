import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Platform } from 'react-native';
import { Text, FAB, useTheme, Card, SegmentedButtons, IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import AppLogo from '../components/AppLogo';
import LoadingScreen from '../components/LoadingScreen';
import { brandColors } from '../theme';

interface Task {
  id: string;
  title: string;
  category: 'ELECTRICITY' | 'PLUMBING' | 'CARPENTRY' | 'PAINTING' | 'MOVING' | 'GENERAL';
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

export default function RequesterDashboard({ navigation }: Props) {
  const theme = useTheme();
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

  const [tab, setTab] = useState<'active' | 'past'>('active');

  const deleteTask = async (taskId: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Delete this task permanently?')
      : true;
    if (!confirmed) return;
    try {
      await api.delete(`/api/tasks/${taskId}`);
      fetchTasks();
    } catch {
      // ignore
    }
  };

  const cancelTask = async (taskId: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to cancel this task?')
      : true;
    if (!confirmed) return;
    try {
      await api.put(`/api/tasks/${taskId}/status`, { status: 'CANCELED' });
      fetchTasks();
    } catch {
      // ignore
    }
  };

  const markCompleted = async (taskId: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Mark this task as completed?')
      : true;
    if (!confirmed) return;
    try {
      await api.put(`/api/tasks/${taskId}/status`, { status: 'COMPLETED' });
      fetchTasks();
    } catch {
      // ignore
    }
  };

  const activeTasks = tasks
    .filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
    .sort((a, b) => {
      // IN_PROGRESS first
      if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1;
      if (b.status === 'IN_PROGRESS' && a.status !== 'IN_PROGRESS') return 1;
      // Then by bid count
      return (b.bid_count || 0) - (a.bid_count || 0);
    });
  const pastTasks = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELED');
  const displayedTasks = tab === 'active' ? activeTasks : pastTasks;

  if (loading) {
    return <LoadingScreen label="Loading your tasks..." />;
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.flex}>
        <EmptyState
          icon="clipboard-text-outline"
          title="No tasks yet"
          message="Post your first task and get help today!"
          actionLabel="Create Task"
          onAction={() => navigation.navigate('CreateTask')}
        />
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
          onPress={() => navigation.navigate('CreateTask')}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={displayedTasks}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <Card style={styles.heroCard} mode="elevated">
              <Card.Content style={styles.heroContent}>
                <AppLogo />
              </Card.Content>
            </Card>
            <SegmentedButtons
              value={tab}
              onValueChange={(v) => setTab(v as 'active' | 'past')}
              buttons={[
                { value: 'active', label: `Active (${activeTasks.length})` },
                { value: 'past', label: `Past (${pastTasks.length})` },
              ]}
              style={styles.tabs}
            />
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.taskRow}>
            <View style={styles.taskCardWrap}>
              <TaskCard
                title={item.title}
                category={item.category}
                status={item.status}
                suggestedPrice={item.suggested_price}
                locationName={item.general_location_name}
                bidCount={item.bid_count}
                fixerName={item.assigned_fixer_name}
                onPress={() => navigation.navigate('TaskDetails', { taskId: item.id })}
                onCancel={tab === 'active' ? () => cancelTask(item.id) : undefined}
                onMarkCompleted={tab === 'active' && item.status === 'IN_PROGRESS' ? () => markCompleted(item.id) : undefined}
                onEdit={tab === 'active' && item.status === 'OPEN' ? () => navigation.navigate('TaskDetails', { taskId: item.id }) : undefined}
              />
            </View>
            {tab === 'past' && (
              <IconButton
                icon="delete-outline"
                iconColor={brandColors.danger}
                size={22}
                onPress={() => deleteTask(item.id)}
                style={styles.deleteButton}
              />
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text variant="bodyMedium" style={styles.emptyText}>
            {tab === 'active' ? 'No active tasks.' : 'No past tasks.'}
          </Text>
        }
        contentContainerStyle={styles.list}
      />
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
        onPress={() => navigation.navigate('CreateTask')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    marginBottom: 8,
    borderRadius: 20,
    backgroundColor: brandColors.surface,
  },
  heroContent: {
    alignItems: 'center' as const,
    paddingVertical: 0,
  },
  tabs: {
    marginBottom: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCardWrap: {
    flex: 1,
  },
  deleteButton: {
    margin: 0,
  },
  emptyText: {
    color: brandColors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center' as const,
    marginTop: 24,
  },
  list: {
    padding: 16,
    paddingBottom: 92,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 18,
  },
});
