import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Avatar, Divider, Modal, Portal, Text, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import api from '../api/axiosInstance';
import useReviews, { reportReview, type Review } from '../hooks/useReviews';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { FCard } from '../components/ui';
import { brandColors, spacing, radii, typography } from '../theme';
import { getCategoryMeta, getCategoryLabel } from '../utils/categoryMetadata';

interface PortfolioItem {
  id: string;
  image_url: string;
  description: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  bio: string | null;
  average_rating_as_fixer: number | null;
  completed_tasks_as_fixer: number;
  avg_response_time_minutes: number | null;
  verification_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  specializations: string[];
  created_at: string;
  portfolio_items: PortfolioItem[];
  certifications?: { id: string; category: string; title: string }[];
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

const REPORT_REASONS = ['SPAM', 'OFFENSIVE', 'MISLEADING', 'OTHER'] as const;

function ReviewCard({ review, currentUserId }: { review: Review; currentUserId: string | null }) {
  const canReport = currentUserId === review.reviewee_id;
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const dateLocale = language === 'he' ? 'he-IL' : 'en-US';
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<typeof REPORT_REASONS[number] | null>(null);
  const [otherDetails, setOtherDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const date = new Date(review.created_at).toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const submitReport = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      await reportReview(review.id, selectedReason, otherDetails.trim() || undefined);
      setReportModalVisible(false);
      setSelectedReason(null);
      setOtherDetails('');
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(t('publicProfile.report.submitted'));
      } else {
        Alert.alert(t('publicProfile.report.thankYou'), t('publicProfile.report.submitted'));
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string } }; status?: number };
      };
      const message =
        axiosErr.response?.status === 409
          ? t('publicProfile.report.alreadyReported')
          : axiosErr.response?.data?.error?.message ?? t('publicProfile.report.failedSubmit');
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(message);
      } else {
        Alert.alert(t('common.error'), message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FCard style={styles.reviewCard}>
      <View style={[styles.reviewHeader, isRTL && { direction: 'rtl' as const }]}>
        <View style={styles.reviewerInfo}>
          <Avatar.Icon
            size={32}
            icon="account"
            style={{ backgroundColor: brandColors.primaryMuted }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyMedium, { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {review.reviewer?.full_name ?? t('publicProfile.anonymous')}
            </Text>
            {review.task?.title && (
              <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]} numberOfLines={1}>
                {review.task.title}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.reviewHeaderRight}>
          <Text style={[typography.caption, { color: brandColors.textMuted }]}>{date}</Text>
          {canReport && (
            <Pressable onPress={() => setReportModalVisible(true)} hitSlop={8}>
              <MaterialCommunityIcons name="flag-outline" size={16} color={brandColors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <StarRating rating={review.rating} size={14} />

      {review.comment ? (
        <Text style={[typography.body, { color: brandColors.textSecondary, marginTop: spacing.sm, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
          {review.comment}
        </Text>
      ) : null}

      {/* Report Modal */}
      <Portal>
        <Modal
          visible={reportModalVisible}
          onDismiss={() => { setReportModalVisible(false); setSelectedReason(null); setOtherDetails(''); }}
          contentContainerStyle={styles.reportModal}
        >
          <Text style={[typography.h3, { color: brandColors.textPrimary, marginBottom: spacing.xs , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('publicProfile.report.title')}
          </Text>
          <Text style={[typography.bodySm, { color: brandColors.textMuted, marginBottom: spacing.md , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
            {t('publicProfile.report.prompt')}
          </Text>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              style={[styles.reportOption, selectedReason === reason && styles.reportOptionSelected]}
              onPress={() => setSelectedReason(reason)}
            >
              <MaterialCommunityIcons
                name={selectedReason === reason ? 'radiobox-marked' : 'radiobox-blank'}
                size={20}
                color={selectedReason === reason ? brandColors.primary : brandColors.textMuted}
              />
              <Text style={[typography.body, { color: selectedReason === reason ? brandColors.primary : brandColors.textPrimary , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t(`publicProfile.report.reasons.${reason}`)}
              </Text>
            </Pressable>
          ))}
          <TextInput
            mode="outlined"
            placeholder={t('publicProfile.report.detailsPlaceholder')}
            value={otherDetails}
            onChangeText={setOtherDetails}
            multiline
            numberOfLines={3}
            style={{ marginTop: spacing.sm, backgroundColor: brandColors.surface }}
          />
          {selectedReason === 'OTHER' && !otherDetails.trim() && (
            <Text style={[typography.caption, { color: brandColors.danger, marginTop: spacing.xs , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('publicProfile.report.detailsRequired')}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Pressable
              style={[styles.reportBtn, styles.reportBtnCancel]}
              onPress={() => { setReportModalVisible(false); setSelectedReason(null); setOtherDetails(''); }}
            >
              <Text style={[typography.label, { color: brandColors.textMuted , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.reportBtn, styles.reportBtnSubmit, (!selectedReason || (selectedReason === 'OTHER' && !otherDetails.trim())) && { opacity: 0.5 }]}
              onPress={() => void submitReport()}
              disabled={!selectedReason || (selectedReason === 'OTHER' && !otherDetails.trim()) || submitting}
            >
              <Text style={[typography.label, { color: brandColors.white , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {submitting ? t('common.loading') : t('common.submit')}
              </Text>
            </Pressable>
          </View>
        </Modal>
      </Portal>
    </FCard>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PublicProfileScreen({ route }: { route: any }) {
  const { userId } = route.params;
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const dateLocale = language === 'he' ? 'he-IL' : 'en-US';
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const { reviews, total, loading: reviewsLoading, refetch } = useReviews({ userId });

  React.useEffect(() => {
    api.get('/api/users/me')
      .then((res) => setCurrentUserId(res.data.user?.id ?? null))
      .catch(() => { /* ignore */ });
  }, []);

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
    return <LoadingScreen label={t('publicProfile.loading')} />;
  }

  const formatResponseTime = (minutes: number): string => {
    if (minutes < 60) return t('publicProfile.respondsIn', { value: Math.round(minutes), unit: t('publicProfile.timeUnit.min') });
    if (minutes < 1440) return t('publicProfile.respondsIn', { value: Math.round(minutes / 60), unit: t('publicProfile.timeUnit.hr') });
    return t('publicProfile.respondsIn', { value: Math.round(minutes / 1440), unit: t('publicProfile.timeUnit.days') });
  };

  const avgRating = profile?.average_rating_as_fixer;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' })
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

          {/* Name + verified badge */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
            <Text style={[typography.h2, { color: brandColors.textPrimary }]}>
              {profile?.full_name ?? 'User'}
            </Text>
            {profile?.verification_status === 'APPROVED' && (
              <MaterialCommunityIcons name="check-decagram" size={22} color="#29B6F6" />
            )}
          </View>

          {/* Rating */}
          {avgRating != null && avgRating > 0 && (
            <View style={styles.ratingRow}>
              <StarRating rating={avgRating} size={20} />
              <Text style={[typography.bodyMedium, { color: brandColors.textSecondary, marginLeft: spacing.sm, writingDirection: 'ltr' }]}>
                {avgRating.toFixed(1)}
              </Text>
              <Text style={[typography.bodySm, { color: brandColors.textMuted, marginLeft: spacing.xs , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                ({t('publicProfile.reviewCount', { count: total })})
              </Text>
            </View>
          )}

          {/* Stats row: completed tasks + response time */}
          <View style={styles.statsRow}>
            {(profile?.completed_tasks_as_fixer ?? 0) > 0 && (
              <View style={styles.statChip}>
                <MaterialCommunityIcons name="check-circle-outline" size={14} color={brandColors.success} />
                <Text style={[typography.bodySm, { color: brandColors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('publicProfile.tasksCompleted', { count: profile!.completed_tasks_as_fixer })}
                </Text>
              </View>
            )}
            {profile?.avg_response_time_minutes != null && (
              <View style={styles.statChip}>
                <MaterialCommunityIcons name="clock-fast" size={14} color={brandColors.primary} />
                <Text style={[typography.bodySm, { color: brandColors.textSecondary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {formatResponseTime(profile.avg_response_time_minutes)}
                </Text>
              </View>
            )}
          </View>

          {/* Member since */}
          {memberSince && (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={brandColors.textMuted} />
              <Text style={[typography.bodySm, { color: brandColors.textMuted, marginLeft: spacing.xs, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                {t('publicProfile.memberSince', { date: memberSince })}
              </Text>
            </View>
          )}

          {/* Specializations */}
          {profile?.specializations && profile.specializations.length > 0 && (
            <View style={styles.specRow}>
              {profile.specializations.map((s) => {
                const meta = getCategoryMeta(s);
                return (
                  <View key={s} style={[styles.specChip, { backgroundColor: meta.bg }]}>
                    <MaterialCommunityIcons name={meta.icon as never} size={14} color={meta.color} />
                    <Text style={[typography.caption, { color: meta.color, writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {getCategoryLabel(s as never, t)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Certification badges */}
          {profile?.certifications && profile.certifications.length > 0 && (
            <View style={styles.certBadgeRow}>
              {profile.certifications.map((cert) => {
                const meta = getCategoryMeta(cert.category);
                return (
                  <View key={cert.id} style={[styles.certBadge, { backgroundColor: meta.bg }]}>
                    <MaterialCommunityIcons name="check-decagram" size={14} color={meta.color} />
                    <Text style={[typography.caption, { color: meta.color, fontWeight: '700' , writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                      {t(`fixerProfile.certifications.badge.${cert.category}`)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Portfolio */}
          {(profile?.portfolio_items?.length ?? 0) > 0 && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="image-multiple-outline" size={18} color={brandColors.primaryMuted} />
                <Text style={[typography.h3, { color: brandColors.textPrimary, marginLeft: spacing.sm, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
                  {t('publicProfile.portfolioTitle', { count: profile!.portfolio_items.length })}
                </Text>
              </View>
              <View style={styles.portfolioGrid}>
                {profile!.portfolio_items.map(item => (
                  <Image key={item.id} source={{ uri: item.image_url }} style={styles.portfolioThumb} />
                ))}
              </View>
            </>
          )}

          <Divider style={styles.divider} />

          {/* Reviews section header */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="star" size={18} color={brandColors.secondary} />
            <Text style={[typography.h3, { color: brandColors.textPrimary, marginLeft: spacing.sm, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}>
              {t('publicProfile.reviewsTitle', { count: total })}
            </Text>
          </View>
        </View>
      }
      renderItem={({ item }) => <ReviewCard review={item} currentUserId={currentUserId} />}
      ListEmptyComponent={
        <EmptyState
          icon="star-outline"
          title={t('publicProfile.noReviews')}
          message={t('publicProfile.noReviewsMessage')}
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: brandColors.surfaceAlt,
  },
  specRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  certBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
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
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
  portfolioThumb: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 6,
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
  reviewHeaderRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  reportModal: {
    backgroundColor: brandColors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  reportOptionSelected: {
    backgroundColor: brandColors.primaryMuted + '20',
  },
  reportBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  reportBtnCancel: {
    backgroundColor: brandColors.surfaceAlt,
  },
  reportBtnSubmit: {
    backgroundColor: brandColors.primary,
  },
});
