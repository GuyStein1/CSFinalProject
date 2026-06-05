import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
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
import { useTranslation } from 'react-i18next';
import api from '../api/axiosInstance';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import { FButton, FChip } from '../components/ui';
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
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'in_progress' | 'review' | 'open' | 'bids' | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth());
  const { width } = useWindowDimensions();

  const wide = width >= 820;
  const horizontalPadding = wide ? spacing.xxxl : spacing.lg;

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/api/users/me/tasks', { params: { limit: 50 } });
      setTasks(res.data.tasks || []);
      setLoadError(null);
    } catch {
      setLoadError(t('myTasks.loadError'));
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
    cancelLabel,
    destructive = false,
    onConfirm,
  }: ConfirmationOptions) => {
    const cancel = cancelLabel ?? t('common.cancel');
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`${title}\n\n${message}`)) void onConfirm();
      return;
    }

    Alert.alert(title, message, [
      { text: cancel, style: 'cancel' },
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
        Alert.alert(t('common.error'), t('myTasks.alerts.failedDelete'));
      }
    };

    const message =
      task.status === 'IN_PROGRESS'
        ? t('myTasks.actions.delete.messageInProgress', { title: task.title })
        : t('myTasks.actions.delete.message', { title: task.title });

    confirmAction({
      title: t('myTasks.actions.delete.title'),
      message,
      confirmLabel: t('myTasks.actions.delete.confirm'),
      cancelLabel: t('myTasks.actions.delete.keep'),
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
        Alert.alert(t('common.error'), t('myTasks.alerts.failedCancel'));
      }
    };

    const message =
      task.status === 'IN_PROGRESS'
        ? t('myTasks.actions.cancel.messageInProgress', { title: task.title })
        : t('myTasks.actions.cancel.message', { title: task.title });

    confirmAction({
      title: t('myTasks.actions.cancel.title'),
      message,
      confirmLabel: t('myTasks.actions.cancel.confirm'),
      cancelLabel: t('myTasks.actions.cancel.keep'),
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
        Alert.alert(t('common.error'), t('myTasks.alerts.failedComplete'));
      }
    };

    confirmAction({
      title: t('myTasks.actions.complete.title'),
      message: t('myTasks.actions.complete.message', { title: task.title }),
      confirmLabel: t('myTasks.actions.complete.confirm'),
      cancelLabel: t('myTasks.actions.complete.notYet'),
      onConfirm: doComplete,
    });
  };

  const reactivateTask = (task: Task) => {
    const doReactivate = async (): Promise<boolean> => {
      try {
        await api.put(`/api/tasks/${task.id}/reopen`);
        void fetchTasks();
        return true;
      } catch {
        Alert.alert(t('common.error'), t('myTasks.alerts.failedReopen'));
        return false;
      }
    };

    const message = t('myTasks.actions.reopen.message', { title: task.title });

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`${t('myTasks.actions.reopen.title')}\n\n${message}\n\n${t('myTasks.actions.reopen.webSuffix')}`)) {
        void doReactivate().then((reopened) => {
          if (reopened) navigation.navigate('TaskDetails', { taskId: task.id, openEdit: true });
        });
      }
    } else {
      Alert.alert(t('myTasks.actions.reopen.title'), message, [
        { text: t('myTasks.actions.reopen.keepCanceled'), style: 'cancel' },
        {
          text: t('myTasks.actions.reopen.reopenAsIs'),
          onPress: () => void doReactivate(),
        },
        {
          text: t('myTasks.actions.reopen.reopenAndEdit'),
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

  // Apply pill filter
  const filteredActiveTasks = filter === 'in_progress'
    ? activeTasks.filter((t) => t.status === 'IN_PROGRESS')
    : filter === 'open'
      ? activeTasks.filter((t) => t.status === 'OPEN')
      : filter === 'bids'
        ? activeTasks.filter((t) => (t.bid_count ?? 0) > 0)
        : filter === 'review'
          ? []
          : activeTasks;

  const filteredPastTasksBase = filter === 'review'
    ? pastTasks.filter((t) => t.status === 'COMPLETED' && !t.has_review)
    : filter != null
      ? []
      : pastTasks;

  // Year/month filtering for past tasks
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const availableYears = [...new Set(
    filteredPastTasksBase.map((t) => new Date(t.completed_at ?? t.created_at).getFullYear()),
  )].sort((a, b) => b - a);

  const effectiveYear = selectedYear;

  const availableMonths = effectiveYear != null
    ? [...new Set(
        filteredPastTasksBase
          .filter((t) => new Date(t.completed_at ?? t.created_at).getFullYear() === effectiveYear)
          .map((t) => new Date(t.completed_at ?? t.created_at).getMonth()),
      )].sort((a, b) => b - a)
    : [];

  const filteredPastTasks = effectiveYear != null
    ? filteredPastTasksBase.filter((t) => {
        const d = new Date(t.completed_at ?? t.created_at);
        if (d.getFullYear() !== effectiveYear) return false;
        if (selectedMonth != null && d.getMonth() !== selectedMonth) return false;
        return true;
      })
    : [];

  if (loading) return <LoadingScreen label={t('myTasks.loading')} />;

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
              activeFilter={filter}
              onPillPress={(f) => setFilter(filter === f ? null : f)}
            />
            <View style={styles.emptyPanel}>
              <EmptyState
                icon="alert-circle-outline"
                title={t('myTasks.empty.couldNotLoad.title')}
                message={loadError ?? ''}
                actionLabel={t('myTasks.empty.couldNotLoad.retry')}
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
              activeFilter={filter}
              onPillPress={(f) => setFilter(filter === f ? null : f)}
            />
            <View style={styles.emptyPanel}>
              <EmptyState
                icon="clipboard-text-outline"
                title={t('myTasks.empty.noTasks.title')}
                message={t('myTasks.empty.noTasks.message')}
                actionLabel={t('myTasks.empty.noTasks.action')}
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
            activeFilter={filter}
            onPillPress={(f) => setFilter(filter === f ? null : f)}
          />
          {loadError && <ErrorBanner message={loadError} onRetry={retryTasks} />}

          <View style={styles.section}>
            <SectionHeader
              label={t('myTasks.sections.active')}
              count={filteredActiveTasks.length}
              helper={t('myTasks.sections.activeHelper')}
            />
            {filteredActiveTasks.length > 0 ? (
              filteredActiveTasks.map((task) => (
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
                title={t('myTasks.empty.noActive.title')}
                message={t('myTasks.empty.noActive.message')}
              />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader
              label={t('myTasks.sections.past')}
              count={filteredPastTasks.length}
              helper={t('myTasks.sections.pastHelper')}
              muted
            />

            {/* Year / Month filters */}
            {availableYears.length > 0 && (
              <View style={styles.dateFilters}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateFilterRow}>
                  {availableYears.map((year) => (
                    <FChip
                      key={year}
                      label={String(year)}
                      selected={effectiveYear === year}
                      onPress={() => {
                        if (year === effectiveYear) {
                          setSelectedYear(null);
                          setSelectedMonth(null);
                        } else {
                          setSelectedYear(year);
                          setSelectedMonth(null);
                        }
                      }}
                      compact
                    />
                  ))}
                </ScrollView>
                {effectiveYear != null && availableMonths.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateFilterRow}>
                    {availableMonths.map((month) => (
                      <FChip
                        key={month}
                        label={MONTH_NAMES[month]}
                        selected={selectedMonth === month}
                        onPress={() => setSelectedMonth(month === selectedMonth ? null : month)}
                        compact
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {filteredPastTasks.length > 0 ? (
              filteredPastTasks.map((task) => {
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
                title={t('myTasks.empty.noPast.title')}
                message={t('myTasks.empty.noPast.message')}
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
  activeFilter,
  onPillPress,
}: {
  wide: boolean;
  openTasksCount: number;
  inProgressCount: number;
  pendingBidCount: number;
  reviewCount: number;
  activeFilter: 'in_progress' | 'review' | 'open' | 'bids' | null;
  onPillPress: (filter: 'in_progress' | 'review' | 'open' | 'bids') => void;
}) {
  const { t } = useTranslation();
  return (
    <LinearGradient
      colors={[brandColors.primary, brandColors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerCard}
    >
      <View style={[styles.headerTop, wide && styles.headerTopWide]}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>{t('myTasks.header.eyebrow')}</Text>
          <Text style={styles.headerTitle}>{t('myTasks.header.title')}</Text>
          <Text style={styles.headerBody}>{t('myTasks.header.body')}</Text>
        </View>
      </View>

      <View style={[styles.summaryRail, wide && styles.summaryRailWide]}>
        <SummaryPill
          icon="clipboard-text-outline"
          label={t('myTasks.pills.open')}
          value={openTasksCount}
          color={brandColors.success}
          wide={wide}
          active={activeFilter === 'open'}
          onPress={() => onPillPress('open')}
        />
        <SummaryPill
          icon="progress-wrench"
          label={t('myTasks.pills.inProgress')}
          value={inProgressCount}
          color={brandColors.secondary}
          wide={wide}
          active={activeFilter === 'in_progress'}
          onPress={() => onPillPress('in_progress')}
        />
        <SummaryPill
          icon="hand-extended-outline"
          label={t('myTasks.pills.hasBids')}
          value={pendingBidCount}
          color={brandColors.secondaryLight}
          wide={wide}
          active={activeFilter === 'bids'}
          onPress={() => onPillPress('bids')}
        />
        <SummaryPill
          icon="star-outline"
          label={t('myTasks.pills.toReview')}
          value={reviewCount}
          color={brandColors.warning}
          wide={wide}
          active={activeFilter === 'review'}
          onPress={() => onPillPress('review')}
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
  active,
  onPress,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  wide: boolean;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.summaryPill, wide && styles.summaryPillWide, active && { borderColor: color, borderWidth: 2 }]}
    >
      <View style={styles.summaryIcon}>
        <MaterialCommunityIcons name={icon as never} size={16} color={color} />
      </View>
      <View>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    </Pressable>
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
  const { t } = useTranslation();
  return (
    <View style={styles.errorBanner}>
      <View style={styles.errorIcon}>
        <MaterialCommunityIcons name="alert-circle-outline" size={18} color={brandColors.danger} />
      </View>
      <View style={styles.errorCopy}>
        <Text style={[typography.label, { color: brandColors.textPrimary }]}>{t('myTasks.error.refreshTitle')}</Text>
        <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>{message}</Text>
      </View>
      <FButton onPress={onRetry} variant="outline" size="sm" icon="refresh">
        {t('myTasks.empty.couldNotLoad.retry')}
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
    flexGrow: 0,
    flexShrink: 0,
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
  dateFilters: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
