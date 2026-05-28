import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { FButton, FCard } from '../components/ui';
import { brandColors, spacing, radii, typography, shadows } from '../theme';

interface Report {
  id: string;
  reason: string;
  details: string | null;
  created_at: string;
  reporter: { id: string; full_name: string };
}

interface FlaggedReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  is_hidden: boolean;
  reviewer: { id: string; full_name: string; email: string };
  reviewee: { id: string; full_name: string; email: string };
  task: { id: string; title: string } | null;
  reports: Report[];
}

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  OFFENSIVE: 'Offensive',
  MISLEADING: 'Misleading',
  OTHER: 'Other',
};

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={14}
          color={brandColors.secondary}
        />
      ))}
    </View>
  );
}

export default function AdminScreen() {
  const [reviews, setReviews] = useState<FlaggedReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlagged = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/flagged-reviews');
      setReviews(res.data.reviews ?? []);
    } catch {
      const msg = 'Failed to load flagged reviews';
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchFlagged();
    }, [fetchFlagged]),
  );

  const handleHide = async (reviewId: string) => {
    try {
      await api.post(`/api/admin/reviews/${reviewId}/hide`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {
      const msg = 'Failed to hide review';
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const handleDismiss = async (reviewId: string) => {
    try {
      await api.post(`/api/admin/reviews/${reviewId}/dismiss`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {
      const msg = 'Failed to dismiss reports';
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) return <LoadingScreen label="Loading flagged reviews..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconShell}>
            <MaterialCommunityIcons name="shield-account" size={20} color={brandColors.secondary} />
          </View>
          <View>
            <Text style={styles.headerKicker}>FixIt Admin</Text>
            <Text style={styles.headerTitle}>Review Moderation</Text>
          </View>
        </View>
        <Pressable onPress={() => void handleLogout()} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={18} color={brandColors.danger} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{reviews.length}</Text>
          <Text style={styles.statLabel}>Flagged Reviews</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {reviews.reduce((sum, r) => sum + r.reports.length, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Reports</Text>
        </View>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <FCard style={styles.reviewCard}>
            <View style={styles.reviewMeta}>
              <View style={styles.metaBlock}>
                <Text style={[typography.caption, { color: brandColors.textMuted }]}>Reviewer</Text>
                <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>
                  {item.reviewer.full_name}
                </Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={16} color={brandColors.textMuted} />
              <View style={styles.metaBlock}>
                <Text style={[typography.caption, { color: brandColors.textMuted }]}>Reviewee</Text>
                <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>
                  {item.reviewee.full_name}
                </Text>
              </View>
            </View>

            {item.task && (
              <Text style={[typography.caption, { color: brandColors.textMuted, marginBottom: spacing.xs }]}>
                Task: {item.task.title}
              </Text>
            )}

            <StarRow rating={item.rating} />

            {item.comment && (
              <View style={styles.commentBox}>
                <Text style={[typography.body, { color: brandColors.textSecondary }]}>
                  &ldquo;{item.comment}&rdquo;
                </Text>
              </View>
            )}

            <View style={styles.reportsSection}>
              <Text style={[typography.bodyMedium, { color: brandColors.danger, marginBottom: spacing.xs }]}>
                Reports ({item.reports.length}):
              </Text>
              {item.reports.map((report) => (
                <View key={report.id} style={styles.reportRow}>
                  <View style={[styles.reasonBadge, { backgroundColor: brandColors.dangerSoft }]}>
                    <Text style={[typography.caption, { color: brandColors.danger }]}>
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </Text>
                  </View>
                  <Text style={[typography.bodySm, { color: brandColors.textMuted, flex: 1 }]}>
                    by {report.reporter.full_name}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.actions}>
              <FButton
                variant="outline"
                size="sm"
                icon="eye-off-outline"
                onPress={() => void handleHide(item.id)}
                style={{ flex: 1 }}
              >
                Hide Review
              </FButton>
              <FButton
                variant="secondary"
                size="sm"
                icon="check-circle-outline"
                onPress={() => void handleDismiss(item.id)}
                style={{ flex: 1 }}
              >
                Dismiss
              </FButton>
            </View>
          </FCard>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="check-circle-outline"
            title="All clear!"
            message="No flagged reviews to moderate."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brandColors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: Platform.OS === 'web' ? spacing.lg : spacing.huge,
    ...shadows.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIconShell: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(241,181,69,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241,181,69,0.22)',
  },
  headerKicker: {
    ...typography.caption,
    color: brandColors.secondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: brandColors.textOnDark,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: brandColors.dangerSoft,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: brandColors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: brandColors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: brandColors.textMuted,
    marginTop: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    borderLeftWidth: 3,
    borderLeftColor: brandColors.danger,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaBlock: {
    flex: 1,
  },
  commentBox: {
    backgroundColor: brandColors.surfaceAlt,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  reportsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: brandColors.outlineLight,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  reasonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
