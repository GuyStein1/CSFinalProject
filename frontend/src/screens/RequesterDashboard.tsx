import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FButton } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

type Category = 'ELECTRICITY' | 'PLUMBING' | 'CARPENTRY' | 'PAINTING' | 'MOVING' | 'GENERAL';

interface Props {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

interface CategoryInfo {
  value: Category;
  label: string;
  icon: string;
  description: string;
  examples: string[];
}

const CATEGORIES: CategoryInfo[] = [
  {
    value: 'ELECTRICITY',
    label: 'Electricity',
    icon: 'lightning-bolt',
    description: 'Wiring, lighting, outlets & electrical repairs',
    examples: ['Fix a light fixture', 'Install an outlet', 'Replace a breaker'],
  },
  {
    value: 'PLUMBING',
    label: 'Plumbing',
    icon: 'water',
    description: 'Leaks, pipes, faucets & water installations',
    examples: ['Fix a leaking pipe', 'Unclog a drain', 'Install a faucet'],
  },
  {
    value: 'CARPENTRY',
    label: 'Carpentry',
    icon: 'hammer',
    description: 'Furniture, shelves, doors & woodwork',
    examples: ['Assemble furniture', 'Hang shelves', 'Fix a door'],
  },
  {
    value: 'PAINTING',
    label: 'Painting',
    icon: 'format-paint',
    description: 'Interior & exterior walls, touch-ups, full rooms',
    examples: ['Paint a room', 'Touch up walls', 'Paint exterior trim'],
  },
  {
    value: 'MOVING',
    label: 'Moving',
    icon: 'truck',
    description: 'Help moving furniture, packing & heavy lifting',
    examples: ['Move furniture', 'Pack boxes', 'Load / unload a truck'],
  },
  {
    value: 'GENERAL',
    label: 'General',
    icon: 'wrench',
    description: "Handyman tasks that don't fit other categories",
    examples: ['Mount a TV', 'Hang pictures', 'General repairs'],
  },
];

export default function RequesterDashboard({ navigation }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const handleCategoryPress = (value: Category) => {
    setSelectedCategory((prev) => (prev === value ? null : value));
  };

  const selected = CATEGORIES.find((c) => c.value === selectedCategory) ?? null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ─────────────────────────────────────────────────── */}
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
          style={({ pressed }) => [styles.heroCta, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          onPress={() => navigation.navigate('CreateTask')}
        >
          <MaterialCommunityIcons name="plus" size={20} color={brandColors.textPrimary} />
          <Text style={[typography.button, { color: brandColors.textPrimary }]}>Post a Task</Text>
        </Pressable>
      </LinearGradient>

      {/* ── Categories ───────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[typography.h3, styles.sectionTitle]}>Browse by category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.value;
            return (
              <Pressable
                key={cat.value}
                style={({ pressed }) => [
                  styles.categoryTile,
                  isActive && styles.categoryTileActive,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => handleCategoryPress(cat.value)}
              >
                <MaterialCommunityIcons
                  name={cat.icon as never}
                  size={24}
                  color={isActive ? brandColors.secondary : brandColors.primary}
                />
                <Text style={[
                  typography.caption,
                  styles.categoryLabel,
                  isActive && styles.categoryLabelActive,
                ]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Category info panel ─────────────────────────────────── */}
        {selected && (
          <View style={styles.infoPanel}>
            <View style={styles.infoPanelHeader}>
              <View style={styles.infoPanelIcon}>
                <MaterialCommunityIcons name={selected.icon as never} size={20} color={brandColors.primary} />
              </View>
              <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{selected.label}</Text>
            </View>
            <Text style={[typography.body, styles.infoDescription]}>{selected.description}</Text>
            <View style={styles.exampleChips}>
              {selected.examples.map((ex) => (
                <View key={ex} style={styles.chip}>
                  <Text style={[typography.caption, styles.chipText]}>{ex}</Text>
                </View>
              ))}
            </View>
            <FButton
              onPress={() => navigation.navigate('CreateTask', { category: selected.value })}
              variant="primary"
              size="md"
              icon="arrow-right"
              iconRight
              fullWidth
            >
              {`Post a ${selected.label} Task`}
            </FButton>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  scroll: {
    paddingBottom: spacing.huge,
  },

  // hero
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
    ...shadows.md,
  },

  // categories
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  sectionTitle: {
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
    minWidth: 95,
    maxWidth: '32%',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outline,
  },
  categoryTileActive: {
    borderColor: brandColors.secondary,
    backgroundColor: brandColors.warningSoft,
  },
  categoryLabel: {
    color: brandColors.textMuted,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },

  // info panel
  infoPanel: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: brandColors.surface,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    gap: spacing.md,
    ...shadows.md,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoPanelIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoDescription: {
    color: brandColors.textMuted,
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: brandColors.outline,
    backgroundColor: brandColors.background,
  },
  chipText: {
    color: brandColors.textPrimary,
  },
});
