import React from 'react';
import {
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { Avatar, Divider, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import useReviews, { type Review } from '../hooks/useReviews';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { FCard } from '../components/ui';
import { brandColors, spacing, radii, typography } from '../theme';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  average_rating_as_fixer: number | null;
  specializations: string[];
  created_at: string;
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <MaterialCommunityIcons
          key={star}
          name={star <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={brandColors.secondary}
        />
      ))}
    </View>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  ASSEMBLY: 'Assembly',
  MOUNTING: 'Mounting',
  MOVING: 'Moving',
  PAINTING: 'Painting',
  PLUMBING: 'Plumbing',
  ELECTRICITY: 'Electricity',
  OUTDOORS: 'Outdoors',
  CLEANING: 'Cleaning',
};

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <FCard style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Avatar.Icon
            size={32}
            icon="account"
            style={{ backgroundColor: brandColors.primaryMuted }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>
              {review.reviewer?.full_name ?? 'Anonymous'}
            </Text>
            {review.task?.title && (
              <Text style={[typography.caption, { color: brandColors.textMuted }]} numberOfLines={1}>
                {review.task.title}
              </Text>
            )}
          </View>
        </View>
        <Text style={[typography.caption, { color: brandColors.textMuted }]}>{date}</Text>
      </View>

      <StarRating rating={review.rating} size={14} />

      {review.comment ? (
        <Text style={[typography.body, { color: brandColors.textSecondary, marginTop: spacing.sm }]}>
          {review.comment}
        </Text>
      ) : null}
    </FCard>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PublicProfileScreen({ route }: { route: any }) {
  const { userId } = route.params;
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const { reviews, total, loading: reviewsLoading, refetch } = useReviews({ userId });

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await api.get(`/api/users/${userId}`);
      setProfile(res.data.user);
    } catch {
      // Profile may not have a dedicated endpoint — use fallback data from reviews
    } finally {
      setProfileLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      refetch();
    }, [fetchProfile, refetch]),
  );

  if (profileLoading || reviewsLoading) {
    return <LoadingScreen label="Loading profile..." />;
  }

  const avgRating = profile?.average_rating_as_fixer;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : null;

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item.id}
      style={styles.container}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.profileSection}>
          {/* Avatar */}
          {profile?.avatar_url ? (
            <Avatar.Image size={80} source={{ uri: profile.avatar_url }} />
          ) : (
            <Avatar.Icon
              size={80}
              icon="account"
              style={{ backgroundColor: brandColors.primaryMuted }}
            />
          )}

          {/* Name */}
          <Text style={[typography.h2, { color: brandColors.textPrimary, marginTop: spacing.md }]}>
            {profile?.full_name ?? 'User'}
          </Text>

          {/* Rating */}
          {avgRating != null && avgRating > 0 && (
            <View style={styles.ratingRow}>
              <StarRating rating={avgRating} size={20} />
              <Text style={[typography.bodyMedium, { color: brandColors.textSecondary, marginLeft: spacing.sm }]}>
                {avgRating.toFixed(1)}
              </Text>
              <Text style={[typography.bodySm, { color: brandColors.textMuted, marginLeft: spacing.xs }]}>
                ({total} {total === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          )}

          {/* Member since */}
          {memberSince && (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={brandColors.textMuted} />
              <Text style={[typography.bodySm, { color: brandColors.textMuted, marginLeft: spacing.xs }]}>
                Member since {memberSince}
              </Text>
            </View>
          )}

          {/* Specializations */}
          {profile?.specializations && profile.specializations.length > 0 && (
            <View style={styles.specRow}>
              {profile.specializations.map((s) => (
                <View key={s} style={styles.specChip}>
                  <Text style={[typography.caption, { color: brandColors.primary }]}>
                    {CATEGORY_LABELS[s] ?? s}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Divider style={styles.divider} />

          {/* Reviews section header */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="star" size={18} color={brandColors.secondary} />
            <Text style={[typography.h3, { color: brandColors.textPrimary, marginLeft: spacing.sm }]}>
              Reviews ({total})
            </Text>
          </View>
        </View>
      }
      renderItem={({ item }) => <ReviewCard review={item} />}
      ListEmptyComponent={
        <EmptyState
          icon="star-outline"
          title="No reviews yet"
          message="This user hasn't received any reviews."
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  specRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  specChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: brandColors.infoSoft,
  },
  divider: {
    width: '100%',
    marginVertical: spacing.lg,
    backgroundColor: brandColors.outlineLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  reviewCard: {
    marginBottom: 0,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
});
