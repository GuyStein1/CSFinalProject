import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Text, FAB, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import TaskCard from '../components/TaskCard';
import LoadingScreen from '../components/LoadingScreen';
import { brandColors } from '../theme';

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

const CATEGORIES: {
  value: Category;
  label: string;
  icon: string;
  bg: string;
}[] = [
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'lightning-bolt', bg: '#FEF3D7' },
  { value: 'PLUMBING',    label: 'Plumbing',    icon: 'water',          bg: '#DDE7EE' },
  { value: 'CARPENTRY',   label: 'Carpentry',   icon: 'hammer',         bg: '#EDE0D0' },
  { value: 'PAINTING',    label: 'Painting',    icon: 'format-paint',   bg: '#EAE0F0' },
  { value: 'MOVING',      label: 'Moving',      icon: 'truck',          bg: '#D5EBD8' },
  { value: 'GENERAL',     label: 'General',     icon: 'wrench',         bg: brandColors.surfaceAlt },
];

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

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* watermark logo — bottom-right */}
          <Image
            source={require('../../assets/fixit-logo.png')}
            style={styles.heroWatermark}
            resizeMode="contain"
          />

          <Text style={styles.heroEyebrow}>Ready to get things done?</Text>
          <Text style={styles.heroHeadline}>{"What needs\nfixing today?"}</Text>

          <TouchableOpacity
            style={styles.heroCta}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('CreateTask')}
          >
            <MaterialCommunityIcons name="plus" size={20} color={brandColors.textPrimary} />
            <Text style={styles.heroCtaText}>Post a Task</Text>
          </TouchableOpacity>

          {tasks.length > 0 && (
            <View style={styles.heroPills}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{activeTasks.length} active</Text>
              </View>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{pastTasks.length} past</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Category quick-picks ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.categoryTile, { backgroundColor: cat.bg }]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('CreateTask', { category: cat.value })}
              >
                <View style={styles.categoryIconShell}>
                  <MaterialCommunityIcons
                    name={cat.icon as never}
                    size={26}
                    color={brandColors.primary}
                  />
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Empty prompt ───────────────────────────────────────────── */}
        {tasks.length === 0 && (
          <View style={styles.emptyPrompt}>
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={36}
              color={brandColors.outline}
            />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyBody}>
              Pick a category above or tap{' '}
              <Text style={styles.emptyBodyBold}>Post a Task</Text> to get started.
            </Text>
          </View>
        )}

        {/* ── Active tasks ───────────────────────────────────────────── */}
        {activeTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Active Tasks</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeTasks.length}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeRow}
            >
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

        {/* ── Past tasks ─────────────────────────────────────────────── */}
        {pastTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, styles.sectionAccentMuted]} />
              <Text style={[styles.sectionTitle, styles.sectionTitleMuted]}>Past Tasks</Text>
              <View style={[styles.countBadge, styles.countBadgeMuted]}>
                <Text style={[styles.countBadgeText, styles.countBadgeTextMuted]}>
                  {pastTasks.length}
                </Text>
              </View>
            </View>
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
        style={[styles.fab, { backgroundColor: theme.colors.secondary }]}
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

  // ── Hero
  hero: {
    backgroundColor: brandColors.primary,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    marginBottom: 8,
  },
  heroWatermark: {
    position: 'absolute',
    width: 190,
    height: 190,
    right: -24,
    bottom: -20,
    opacity: 0.09,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 252, 246, 0.65)',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  heroHeadline: {
    fontSize: 34,
    fontWeight: '800',
    color: brandColors.surface,
    lineHeight: 42,
    marginBottom: 24,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: brandColors.secondary,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    gap: 8,
    marginBottom: 20,
  },
  heroCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
  heroPills: {
    flexDirection: 'row',
    gap: 10,
  },
  heroPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 252, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 246, 0.18)',
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 252, 246, 0.9)',
  },

  // ── Sections
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 99,
    backgroundColor: brandColors.secondary,
  },
  sectionAccentMuted: {
    backgroundColor: brandColors.outline,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.textPrimary,
    marginBottom: 12,
  },
  sectionTitleMuted: {
    color: brandColors.textMuted,
    marginBottom: 0,
  },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: brandColors.secondary,
  },
  countBadgeMuted: {
    backgroundColor: brandColors.surfaceAlt,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
  countBadgeTextMuted: {
    color: brandColors.textMuted,
  },

  // ── Category tiles
  categoryRow: {
    gap: 10,
    paddingBottom: 4,
  },
  categoryTile: {
    width: 80,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
  },
  categoryIconShell: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: brandColors.textPrimary,
    textAlign: 'center',
  },

  // ── Active tasks
  activeRow: {
    gap: 12,
    paddingBottom: 4,
  },
  activeCard: {
    width: 272,
  },

  // ── Empty state
  emptyPrompt: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 8,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
  emptyBody: {
    fontSize: 14,
    color: brandColors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyBodyBold: {
    fontWeight: '700',
    color: brandColors.textPrimary,
  },

  // ── FAB
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 18,
  },
});
