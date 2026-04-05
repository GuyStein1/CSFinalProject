import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Text,
} from 'react-native';
import { FAB } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import TaskCard from '../components/TaskCard';
import LoadingScreen from '../components/LoadingScreen';
import { brandColors, glass, glassText } from '../theme';

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

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'lightning-bolt' },
  { value: 'PLUMBING',    label: 'Plumbing',    icon: 'water' },
  { value: 'CARPENTRY',   label: 'Carpentry',   icon: 'hammer' },
  { value: 'PAINTING',    label: 'Painting',    icon: 'format-paint' },
  { value: 'MOVING',      label: 'Moving',      icon: 'truck' },
  { value: 'GENERAL',     label: 'General',     icon: 'wrench' },
];

export default function RequesterDashboard({ navigation }: Props) {
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

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={glassText.amber} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <BlurView intensity={glass.dark.blur} tint={glass.dark.tint} style={styles.hero}>
          <View style={styles.heroBorder} />

          {/* logo watermark */}
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
            <MaterialCommunityIcons name="plus" size={18} color={brandColors.textPrimary} />
            <Text style={styles.heroCtaText}>Post a Task</Text>
          </TouchableOpacity>

          {tasks.length > 0 && (
            <View style={styles.heroPills}>
              <BlurView intensity={20} tint="light" style={styles.heroPill}>
                <View style={styles.heroPillBorder} />
                <Text style={styles.heroPillText}>{activeTasks.length} active</Text>
              </BlurView>
              <BlurView intensity={20} tint="light" style={styles.heroPill}>
                <View style={styles.heroPillBorder} />
                <Text style={styles.heroPillText}>{pastTasks.length} past</Text>
              </BlurView>
            </View>
          )}
        </BlurView>

        {/* ── Category quick-picks ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Browse by category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('CreateTask', { category: cat.value })}
              >
                <BlurView intensity={glass.medium.blur} tint={glass.medium.tint} style={styles.categoryTile}>
                  <View style={styles.categoryTileBorder} />
                  <View style={styles.categoryIconShell}>
                    <MaterialCommunityIcons name={cat.icon as never} size={24} color={glassText.amber} />
                  </View>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </BlurView>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Empty prompt ────────────────────────────────────────────── */}
        {tasks.length === 0 && (
          <View style={styles.emptyPrompt}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={36} color={glassText.muted} />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyBody}>
              Pick a category above or tap{' '}
              <Text style={styles.emptyBodyBold}>Post a Task</Text> to get started.
            </Text>
          </View>
        )}

        {/* ── Active tasks ────────────────────────────────────────────── */}
        {activeTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionLabel}>Active Tasks</Text>
              <BlurView intensity={20} tint="light" style={styles.countPill}>
                <View style={styles.countPillBorder} />
                <Text style={styles.countPillText}>{activeTasks.length}</Text>
              </BlurView>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
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

        {/* ── Past tasks ──────────────────────────────────────────────── */}
        {pastTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionAccent, styles.sectionAccentMuted]} />
              <Text style={[styles.sectionLabel, styles.sectionLabelMuted]}>Past Tasks</Text>
              <BlurView intensity={15} tint="light" style={styles.countPill}>
                <View style={styles.countPillBorder} />
                <Text style={[styles.countPillText, styles.countPillTextMuted]}>{pastTasks.length}</Text>
              </BlurView>
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
  },
  scroll: {
    paddingBottom: 110,
  },

  // ── Hero
  hero: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 28,
    overflow: 'hidden',
    padding: 24,
    backgroundColor: glass.dark.bg,
  },
  heroBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: glass.dark.border,
  },
  heroWatermark: {
    position: 'absolute',
    width: 180,
    height: 180,
    right: -20,
    bottom: -24,
    opacity: 0.07,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '500',
    color: glassText.muted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroHeadline: {
    fontSize: 34,
    fontWeight: '800',
    color: glassText.primary,
    lineHeight: 42,
    marginBottom: 22,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: brandColors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 999,
    gap: 7,
    marginBottom: 20,
  },
  heroCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: brandColors.textPrimary,
  },
  heroPills: {
    flexDirection: 'row',
    gap: 8,
  },
  heroPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroPillBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: glassText.secondary,
  },

  // ── Sections
  section: {
    paddingHorizontal: 12,
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
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: glassText.primary,
    marginBottom: 12,
  },
  sectionLabelMuted: {
    color: glassText.muted,
    marginBottom: 0,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  countPillBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: glassText.amber,
  },
  countPillTextMuted: {
    color: glassText.muted,
  },

  // ── Category tiles
  categoryRow: {
    gap: 10,
    paddingBottom: 4,
  },
  categoryTile: {
    width: 82,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    gap: 8,
    backgroundColor: glass.medium.bg,
  },
  categoryTileBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: glass.medium.border,
  },
  categoryIconShell: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(241,181,69,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(241,181,69,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: glassText.secondary,
    textAlign: 'center',
  },

  // ── Active tasks
  hRow: {
    gap: 12,
    paddingBottom: 4,
  },
  activeCard: {
    width: 272,
  },

  // ── Empty state
  emptyPrompt: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 8,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: glassText.primary,
  },
  emptyBody: {
    fontSize: 14,
    color: glassText.secondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyBodyBold: {
    fontWeight: '700',
    color: glassText.primary,
  },

  // ── FAB
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    borderRadius: 18,
    backgroundColor: brandColors.secondary,
  },
});
