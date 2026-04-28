import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import { FButton } from '../components/ui';
import { brandColors, spacing, shadows, radii, typography } from '../theme';
import type { Category } from '../utils/categoryMetadata';

interface Task {
  id: string;
  title: string;
  category: Category;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  suggested_price: number | null;
  general_location_name: string;
  bid_count?: number;
  assigned_fixer_name?: string;
  has_review?: boolean;
  completed_at?: string;
  created_at: string;
}

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

export default function MyTasksScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const wide = width >= 820;
  const horizontalPadding = wide ? spacing.xxxl : spacing.lg;

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/api/users/me/tasks', { params: { limit: 50 } });
      setTasks(res.data.tasks || []);
      setLoadError(null);
    } catch {
      setLoadError('We could not load My Tasks. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchTasks();
    }, [fetchTasks])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void fetchTasks();
  };

  const retryTasks = () => {
    setLoadError(null);
    setLoading(tasks.length === 0);
    setRefreshing(false);
    void fetchTasks();
  };

  // ── Action handlers ──────────────────────────────────────────────

  const confirmAction = ({
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    destructive = false,
    onConfirm,
  }: ConfirmationOptions) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`${title}\n\n${message}`)) void onConfirm();
      return;
    }

    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel' },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => void onConfirm(),
      },
    ]);
  };

  const deleteTask = (task: Task) => {
    const doDelete = async () => {
      try {
        await api.delete(`/api/tasks/${task.id}`);
        void fetchTasks();
      } catch {
        Alert.alert('Error', 'Failed to delete task.');
      }
    };

    const message =
      task.status === 'IN_PROGRESS'
        ? `Delete "${task.title}" while it is in progress? This permanently removes the task record even though a Fixer may already be assigned. Cancel the job first unless you are certain. This cannot be undone.`
        : `Delete "${task.title}" permanently? This removes the task record and related history from My Tasks. This cannot be undone.`;

    confirmAction({
      title: 'Delete task?',
      message,
      confirmLabel: 'Delete task',
      cancelLabel: 'Keep task',
      destructive: true,
      onConfirm: doDelete,
    });
  };

  const cancelTask = (task: Task) => {
    const doCancel = async () => {
      try {
        await api.put(`/api/tasks/${task.id}/status`, { status: 'CANCELED' });
        void fetchTasks();
      } catch {
        Alert.alert('Error', 'Failed to cancel task.');
      }
    };

    const message =
      task.status === 'IN_PROGRESS'
        ? `Cancel "${task.title}" while it is in progress? This stops the active job for you and the assigned Fixer and moves it to Past tasks. Only continue if the work will not be completed here.`
        : `Cancel "${task.title}"? It will move out of active My Tasks and into Past tasks.`;

    confirmAction({
      title: 'Cancel task?',
      message,
      confirmLabel: 'Cancel task',
      cancelLabel: 'Keep task',
      destructive: true,
      onConfirm: doCancel,
    });
  };

  const markCompleted = (task: Task) => {
    const doComplete = async () => {
      try {
        await api.put(`/api/tasks/${task.id}/status`, { status: 'COMPLETED' });
        navigation.navigate('TaskDetails', { taskId: task.id });
      } catch {
        Alert.alert('Error', 'Failed to mark task as completed.');
      }
    };

    confirmAction({
      title: 'Mark task complete?',
      message: `Mark "${task.title}" complete only after the work is finished. This moves it to Past tasks and opens the review step.`,
      confirmLabel: 'Mark complete',
      cancelLabel: 'Not yet',
      onConfirm: doComplete,
    });
  };

  const reactivateTask = (task: Task) => {
    const doReactivate = async (): Promise<boolean> => {
      try {
        await api.put(`/api/tasks/${task.id}/status`, { status: 'OPEN' });
        void fetchTasks();
        return true;
      } catch {
        Alert.alert('Error', 'Failed to reopen task.');
        return false;
      }
    };

    const message = `Reopen "${task.title}" as an open request? Review the task details before accepting new bids. If stale assignment data remains visible, it needs backend support to clear.`;

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`Reopen task?\n\n${message}\n\nThe task details will open next so you can review or edit it.`)) {
        void doReactivate().then((reopened) => {
          if (reopened) navigation.navigate('TaskDetails', { taskId: task.id, openEdit: true });
        });
      }
    } else {
      Alert.alert('Reopen task?', message, [
        { text: 'Keep canceled', style: 'cancel' },
        {
          text: 'Reopen as-is',
          onPress: () => void doReactivate(),
        },
        {
          text: 'Reopen and edit',
          onPress: () =>
            void doReactivate().then((reopened) => {
              if (reopened) navigation.navigate('TaskDetails', { taskId: task.id, openEdit: true });
            }),
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

  const pastTasks = tasks
    .filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELED')
    .sort((a, b) => {
      const aNeeds = a.status === 'COMPLETED' && !a.has_review ? 1 : 0;
      const bNeeds = b.status === 'COMPLETED' && !b.has_review ? 1 : 0;
      return bNeeds - aNeeds;
    });

  const openTasksCount = tasks.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const pendingBidCount = activeTasks.reduce((sum, task) => sum + (task.bid_count || 0), 0);
  const reviewCount = pastTasks.filter((task) => task.status === 'COMPLETED' && !task.has_review).length;

  if (loading) return <LoadingScreen label="Loading your tasks..." />;

  if (loadError && tasks.length === 0) {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={brandColors.primary}
              colors={[brandColors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <WorkspaceHeader
              wide={wide}
              openTasksCount={0}
              inProgressCount={0}
              pendingBidCount={0}
              reviewCount={0}
              onCreate={() => navigation.navigate('CreateTask')}
            />
            <View style={styles.emptyPanel}>
              <EmptyState
                icon="alert-circle-outline"
                title="Couldn't load My Tasks"
                message={loadError}
                actionLabel="Retry"
                onAction={retryTasks}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={brandColors.primary}
              colors={[brandColors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <WorkspaceHeader
              wide={wide}
              openTasksCount={0}
              inProgressCount={0}
              pendingBidCount={0}
              reviewCount={0}
              onCreate={() => navigation.navigate('CreateTask')}
            />
            <View style={styles.emptyPanel}>
              <EmptyState
                icon="clipboard-text-outline"
                title="No tasks yet"
                message="Post your first task and manage bids, status, and completion from this workspace."
                actionLabel="Post Task"
                onAction={() => navigation.navigate('CreateTask')}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={brandColors.primary}
            colors={[brandColors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <WorkspaceHeader
            wide={wide}
            openTasksCount={openTasksCount}
            inProgressCount={inProgressCount}
            pendingBidCount={pendingBidCount}
            reviewCount={reviewCount}
            onCreate={() => navigation.navigate('CreateTask')}
          />
          {loadError && <ErrorBanner message={loadError} onRetry={retryTasks} />}

          <View style={styles.section}>
            <SectionHeader
              label="Active tasks"
              count={activeTasks.length}
              helper="Open requests and jobs currently assigned to a Fixer."
            />
            {activeTasks.length > 0 ? (
              activeTasks.map((task) => (
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
                  onCancel={() => cancelTask(task)}
                  onEdit={
                    task.status === 'OPEN'
                      ? () => navigation.navigate('TaskDetails', { taskId: task.id, openEdit: true })
                      : undefined
                  }
                  onMarkCompleted={
                    task.status === 'IN_PROGRESS' ? () => markCompleted(task) : undefined
                  }
                />
              ))
            ) : (
              <InlineEmpty
                icon="clipboard-check-outline"
                title="No active tasks"
                message="Completed and canceled requests are still available below."
              />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader
              label="Past tasks"
              count={pastTasks.length}
              helper="Completed and canceled work, including review and cleanup actions."
              muted
            />
            {pastTasks.length > 0 ? (
              pastTasks.map((task) => {
                const canReview = task.status === 'COMPLETED' && !task.has_review;
                return (
                  <TaskCard
                    key={task.id}
                    title={task.title}
                    category={task.category}
                    status={task.status}
                    suggestedPrice={task.suggested_price}
                    locationName={task.general_location_name}
                    onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
                    onReactivate={
                      task.status === 'CANCELED' ? () => reactivateTask(task) : undefined
                    }
                    onReview={
                      canReview ? () => navigation.navigate('TaskDetails', { taskId: task.id }) : undefined
                    }
                    onDelete={() => deleteTask(task)}
                    muted
                  />
                );
              })
            ) : (
              <InlineEmpty
                icon="history"
                title="No past tasks"
                message="Finished and canceled jobs will appear here for reference."
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function WorkspaceHeader({
  wide,
  openTasksCount,
  inProgressCount,
  pendingBidCount,
  reviewCount,
  onCreate,
}: {
  wide: boolean;
  openTasksCount: number;
  inProgressCount: number;
  pendingBidCount: number;
  reviewCount: number;
  onCreate: () => void;
}) {
  return (
    <LinearGradient
      colors={[brandColors.primary, brandColors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerCard}
    >
      <View style={[styles.headerTop, wide && styles.headerTopWide]}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>My Tasks</Text>
          <Text style={styles.headerTitle}>Manage every posted job</Text>
          <Text style={styles.headerBody}>
            Review bids, update open requests, complete assigned jobs, and keep finished work out
            of the way.
          </Text>
        </View>
        <FButton
          onPress={onCreate}
          variant="secondary"
          size="md"
          icon="plus"
          style={!wide ? styles.headerButtonFull : undefined}
        >
          Post Task
        </FButton>
      </View>

      <View style={[styles.summaryRail, wide && styles.summaryRailWide]}>
        <SummaryPill
          icon="clipboard-text-outline"
          label="Open"
          value={openTasksCount}
          color={brandColors.success}
          wide={wide}
        />
        <SummaryPill
          icon="progress-wrench"
          label="In progress"
          value={inProgressCount}
          color={brandColors.secondary}
          wide={wide}
        />
        <SummaryPill
          icon="hand-extended-outline"
          label="Pending bids"
          value={pendingBidCount}
          color={brandColors.secondaryLight}
          wide={wide}
        />
        <SummaryPill
          icon="star-outline"
          label="To review"
          value={reviewCount}
          color={brandColors.warning}
          wide={wide}
        />
      </View>
    </LinearGradient>
  );
}

function SummaryPill({
  icon,
  label,
  value,
  color,
  wide,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  wide: boolean;
}) {
  return (
    <View style={[styles.summaryPill, wide && styles.summaryPillWide]}>
      <View style={styles.summaryIcon}>
        <MaterialCommunityIcons name={icon as never} size={16} color={color} />
      </View>
      <View>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    </View>
  );
}

function SectionHeader({
  label,
  count,
  helper,
  muted = false,
}: {
  label: string;
  count: number;
  helper: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, muted && styles.sectionAccentMuted]} />
      <View style={styles.sectionCopy}>
        <View style={styles.sectionTitleRow}>
          <Text style={[typography.h2, { color: muted ? brandColors.textSecondary : brandColors.textPrimary }]}>
            {label}
          </Text>
          <View style={[styles.countBadge, muted && styles.countBadgeMuted]}>
            <Text style={[typography.caption, styles.countText]}>{count}</Text>
          </View>
        </View>
        <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>{helper}</Text>
      </View>
    </View>
  );
}

function InlineEmpty({
  icon,
  title,
  message,
}: {
  icon: string;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.inlineEmpty}>
      <View style={styles.inlineEmptyIcon}>
        <MaterialCommunityIcons name={icon as never} size={20} color={brandColors.primaryMuted} />
      </View>
      <View style={styles.inlineEmptyCopy}>
        <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{title}</Text>
        <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>{message}</Text>
      </View>
    </View>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <View style={styles.errorIcon}>
        <MaterialCommunityIcons name="alert-circle-outline" size={18} color={brandColors.danger} />
      </View>
      <View style={styles.errorCopy}>
        <Text style={[typography.label, { color: brandColors.textPrimary }]}>Could not refresh My Tasks</Text>
        <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>{message}</Text>
      </View>
      <FButton onPress={onRetry} variant="outline" size="sm" icon="refresh">
        Retry
      </FButton>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  scroll: {
    paddingTop: spacing.lg,
    paddingBottom: 104,
  },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  headerCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  headerTop: {
    gap: spacing.lg,
  },
  headerTopWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  headerEyebrow: {
    ...typography.eyebrow,
    color: brandColors.secondary,
  },
  headerTitle: {
    ...typography.h1,
    color: brandColors.textOnDark,
  },
  headerBody: {
    ...typography.bodySm,
    color: brandColors.textOnDarkMuted,
    maxWidth: 560,
  },
  headerButtonFull: {
    width: '100%',
  },
  summaryRail: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  summaryRailWide: {
    flexDirection: 'row',
  },
  summaryPill: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,252,246,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.12)',
  },
  summaryPillWide: {
    flex: 1,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,252,246,0.10)',
  },
  summaryValue: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: brandColors.textOnDark,
  },
  summaryLabel: {
    ...typography.caption,
    color: brandColors.textOnDarkMuted,
  },
  section: {
    marginTop: spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionAccent: {
    width: 4,
    height: 46,
    borderRadius: 2,
    backgroundColor: brandColors.secondary,
  },
  sectionAccentMuted: {
    backgroundColor: brandColors.outline,
  },
  sectionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.secondary,
  },
  countBadgeMuted: {
    backgroundColor: brandColors.surfaceAlt,
  },
  countText: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  emptyPanel: {
    minHeight: 460,
    marginTop: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    overflow: 'hidden',
    ...shadows.sm,
  },
  inlineEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
  },
  inlineEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEmptyCopy: {
    flex: 1,
    gap: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.dangerSoft,
  },
  errorIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.dangerSoft,
  },
  errorCopy: {
    flex: 1,
    minWidth: 180,
    gap: 2,
  },
});
