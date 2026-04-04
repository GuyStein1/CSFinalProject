import React, { useCallback, useState } from 'react';
import { View, FlatList, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, FAB, useTheme, Card } from 'react-native-paper';
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

  const activeTasks = tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const pastTasks = tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELED');

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
        data={pastTasks}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <Card style={styles.heroCard} mode="elevated">
              <Card.Content style={styles.heroContent}>
                <AppLogo />
                <Text variant="bodyMedium" style={styles.heroText}>
                  Keep track of open jobs, compare bids, and move each task forward without the UI
                  fighting you.
                </Text>
                <View style={styles.heroStats}>
                  <View style={styles.statPill}>
                    <Text variant="labelMedium" style={styles.statText}>
                      {activeTasks.length} active
                    </Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text variant="labelMedium" style={styles.statText}>
                      {pastTasks.length} past
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
            {activeTasks.length > 0 && (
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Active Tasks
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {activeTasks.map((task) => (
                    <View key={task.id} style={styles.activeCard}>
                      <TaskCard
                        title={task.title}
                        category={task.category}
                        status={task.status}
                        suggestedPrice={task.suggested_price}
                        locationName={task.general_location_name}
                        bidCount={task.bid_count}
                        fixerName={task.assigned_fixer_name}
                        onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            {pastTasks.length > 0 && (
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Past Tasks
              </Text>
            )}
          </>
        }
        renderItem={({ item }) => (
          <TaskCard
            title={item.title}
            category={item.category}
            status={item.status}
            suggestedPrice={item.suggested_price}
            locationName={item.general_location_name}
            onPress={() => navigation.navigate('TaskDetails', { taskId: item.id })}
          />
        )}
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
    marginBottom: 18,
    borderRadius: 28,
    backgroundColor: brandColors.surface,
  },
  heroContent: {
    gap: 12,
  },
  heroText: {
    color: brandColors.textMuted,
    lineHeight: 20,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  statPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: brandColors.surfaceAlt,
  },
  statText: {
    color: brandColors.primary,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    paddingHorizontal: 4,
    paddingVertical: 10,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  activeCard: {
    width: 272,
    marginRight: 12,
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
