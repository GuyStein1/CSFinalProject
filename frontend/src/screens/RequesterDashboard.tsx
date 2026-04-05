import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Image,
} from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import TaskCard from '../components/TaskCard';
import LoadingScreen from '../components/LoadingScreen';
import { FSectionHeader } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

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
  iconBg: string;
  tileBg: string;
}[] = [
  { value: 'ELECTRICITY', label: 'Electricity', icon: 'lightning-bolt', iconBg: '#F0B429', tileBg: '#FEF3D7' },
  { value: 'PLUMBING',    label: 'Plumbing',    icon: 'water',          iconBg: '#4A90D9', tileBg: '#DDE7EE' },
  { value: 'CARPENTRY',   label: 'Carpentry',   icon: 'hammer',         iconBg: '#A07553', tileBg: '#EDE0D0' },
  { value: 'PAINTING',    label: 'Painting',    icon: 'format-paint',   iconBg: '#8B6DAF', tileBg: '#EAE0F0' },
  { value: 'MOVING',      label: 'Moving',      icon: 'truck',          iconBg: '#4CAF7D', tileBg: '#D5EBD8' },
  { value: 'GENERAL',     label: 'General',     icon: 'wrench',         iconBg: '#7A8B96', tileBg: brandColors.surfaceAlt },
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
        {/* Hero */}
        <LinearGradient
          colors={[brandColors.primaryDark, brandColors.primary, brandColors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Image
            source={require('../../assets/fixit-logo.png')}
            style={styles.heroWatermark}
            resizeMode="contain"
          />

          <Text style={[typography.eyebrow, styles.heroEyebrow]}>Ready to get things done?</Text>
          <Text style={[typography.hero, styles.heroHeadline]}>{"What needs\nfixing today?"}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.heroCta,
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
            onPress={() => navigation.navigate('CreateTask')}
          >
            <MaterialCommunityIcons name="plus" size={20} color={brandColors.textPrimary} />
            <Text style={[typography.button, { color: brandColors.textPrimary }]}>Post a Task</Text>
          </Pressable>

          {tasks.length > 0 && (
            <View style={styles.heroPills}>
              <View style={styles.heroPill}>
                <Text style={[typography.caption, styles.heroPillText]}>{activeTasks.length} active</Text>
              </View>
              <View style={styles.heroPill}>
                <Text style={[typography.caption, styles.heroPillText]}>{pastTasks.length} past</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[typography.h3, styles.categorySectionTitle]}>Browse by category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                style={({ pressed }) => [
                  styles.categoryTile,
                  { backgroundColor: cat.tileBg, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => navigation.navigate('CreateTask', { category: cat.value })}
              >
                <View style={[styles.categoryIconCircle, { backgroundColor: cat.iconBg }]}>
                  <MaterialCommunityIcons
                    name={cat.icon as never}
                    size={22}
                    color={brandColors.white}
                  />
                </View>
                <Text style={[typography.caption, styles.categoryLabel]}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Empty */}
        {tasks.length === 0 && (
          <View style={styles.emptyPrompt}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={32}
                color={brandColors.primaryMuted}
              />
            </View>
            <Text style={[typography.h3, styles.emptyTitle]}>No tasks yet</Text>
            <Text style={[typography.body, styles.emptyBody]}>
              Pick a category above or tap{' '}
              <Text style={{ fontWeight: '700', color: brandColors.textPrimary }}>Post a Task</Text> to get started.
            </Text>
          </View>
        )}

        {/* Active */}
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

        {/* Past */}
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
                muted
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

  hero: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl + 4,
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  heroWatermark: {
    position: 'absolute',
    width: 200,
    height: 200,
    right: -20,
    bottom: -24,
    opacity: 0.07,
  },
  heroEyebrow: {
    color: brandColors.textOnDarkMuted,
    marginBottom: spacing.sm,
  },
  heroHeadline: {
    color: brandColors.textOnDark,
    marginBottom: spacing.xxl,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: brandColors.secondary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.pill,
    gap: spacing.sm,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  heroPills: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  heroPill: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255, 252, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 252, 246, 0.16)',
  },
  heroPillText: {
    color: 'rgba(255, 252, 246, 0.9)',
  },

  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  categorySectionTitle: {
    color: brandColors.textPrimary,
    marginBottom: spacing.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryTile: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    alignItems: 'center',
    gap: spacing.sm + 2,
    minWidth: 95,
    maxWidth: '32%',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    color: brandColors.textPrimary,
    textAlign: 'center',
  },

  emptyPrompt: {
    alignItems: 'center',
    paddingTop: spacing.xxxl + 8,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xxxl + 8,
    gap: spacing.md,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: brandColors.textPrimary,
  },
  emptyBody: {
    color: brandColors.textMuted,
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: brandColors.secondary,
    ...shadows.lg,
  },
});
