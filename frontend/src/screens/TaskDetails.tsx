import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking, Pressable, Platform, Image } from 'react-native';
import {
  Text,
  Avatar,
  Portal,
  Modal,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import api from '../api/axiosInstance';
import LoadingScreen from '../components/LoadingScreen';
import CelebrationOverlay from '../components/CelebrationOverlay';
import { FButton, FCard, FInput, FSectionHeader } from '../components/ui';
import { brandColors, spacing, radii, typography } from '../theme';
import { getCategoryMeta, getCategoryLabel } from '../utils/categoryMetadata';
import { containsProfanity, PROFANITY_ERROR_MESSAGE } from '../utils/profanityFilter';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

interface Bid {
  id: string;
  fixer_id: string;
  offered_price: number;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  is_repeat_customer?: boolean;
  previous_tasks_together?: number;
  fixer?: {
    full_name: string;
    average_rating_as_fixer: number | null;
    phone_number: string | null;
    payment_link: string | null;
    avatar_url: string | null;
  };
}

interface MyReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Task {
  id: string;
  requester_id: string;
  title: string;
  description: string;
  category: string;
  status: TaskStatus;
  urgency?: 'FLEXIBLE' | 'THIS_WEEK' | 'TODAY';
  suggested_price: number | null;
  general_location_name: string;
  exact_address: string;
  media_urls: string[];
  completion_photos: string[];
  is_payment_confirmed: boolean;
  created_at: string;
  completed_at: string | null;
  my_review: MyReview | null;
}

const STATUS_BANNER: Record<TaskStatus, { bg: string; color: string; icon: string }> = {
  OPEN: { bg: brandColors.successSoft, color: brandColors.success, icon: 'progress-clock' },
  IN_PROGRESS: { bg: brandColors.infoSoft, color: brandColors.primaryMuted, icon: 'progress-wrench' },
  COMPLETED: { bg: brandColors.surfaceAlt, color: brandColors.textMuted, icon: 'check-circle-outline' },
  CANCELED: { bg: brandColors.dangerSoft, color: brandColors.danger, icon: 'close-circle-outline' },
};

interface FixerReview {
  id: string;
  rating: number;
  comment: string | null;
  reviewer?: { full_name: string };
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TaskDetails({ route, navigation }: { route: any; navigation: any }) {
  const { t } = useTranslation();
  const { taskId, openEdit } = route.params;
  const [task, setTask] = useState<Task | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [fixerReviews, setFixerReviews] = useState<FixerReview[]>([]);
  const [showFixerReviews, setShowFixerReviews] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [rejectingBidId, setRejectingBidId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const showReviewsForFixer = async (fixerId: string) => {
    try {
      const res = await api.get(`/api/users/${fixerId}/reviews`);
      setFixerReviews(res.data.reviews || []);
      setShowFixerReviews(true);
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [taskRes, bidsRes] = await Promise.all([
        api.get(`/api/tasks/${taskId}`),
        api.get(`/api/tasks/${taskId}/bids`),
      ]);
      const fetchedTask: Task = taskRes.data.task;
      setTask(fetchedTask);
      setBids(bidsRes.data.bids || []);
      // Sync review-submitted state with server (survives refresh / re-mount)
      if (fetchedTask.my_review) {
        setReviewSubmitted(true);
        setReviewRating(fetchedTask.my_review.rating);
        setReviewComment(fetchedTask.my_review.comment ?? '');
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const acceptBid = async (bidId: string) => {
    try {
      await api.put(`/api/bids/${bidId}/accept`);
      setShowCelebration(true);
      fetchData();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  };

  const openDeclineModal = (bidId: string) => {
    setRejectingBidId(bidId);
    setRejectionReason(null);
    setRejectionNote('');
  };

  const confirmDeclineBid = async () => {
    if (!rejectingBidId || !rejectionReason) return;
    try {
      await api.put(`/api/bids/${rejectingBidId}/reject`, {
        rejection_reason: rejectionReason,
        rejection_note: rejectionNote.trim() || undefined,
      });
      setRejectingBidId(null);
      fetchData();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  };

  const cancelTask = async () => {
    const doCancel = async () => {
      try {
        await api.put(`/api/tasks/${taskId}/status`, { status: 'CANCELED' });
        navigation.goBack();
      } catch {
        Alert.alert(t('common.error'), t('taskDetails.alerts.failedCancel'));
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(t('taskDetails.alerts.cancelMessage'))) {
        doCancel();
      }
    } else {
      Alert.alert(t('taskDetails.alerts.cancelTitle'), t('taskDetails.alerts.cancelMessage'), [
        { text: t('common.no') },
        { text: t('taskDetails.alerts.cancelYes'), style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  const markCompleted = async () => {
    try {
      await api.put(`/api/tasks/${taskId}/status`, { status: 'COMPLETED' });
      fetchData();
    } catch {
      Alert.alert(t('common.error'), t('taskDetails.alerts.failedComplete'));
    }
  };

  const reopenTask = async () => {
    const doReopen = async () => {
      try {
        await api.put(`/api/tasks/${taskId}/reopen`);
        fetchData();
      } catch {
        Alert.alert('Error', 'Failed to reopen task.');
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('Reopen this task and re-post it to the discovery feed?')) {
        doReopen();
      }
    } else {
      Alert.alert(
        'Reopen Task',
        'Reopen this task and re-post it to the discovery feed for fixers to bid on?',
        [
          { text: 'Cancel' },
          { text: 'Reopen', onPress: doReopen },
        ],
      );
    }
  };

  const confirmPayment = async () => {
    try {
      await api.put(`/api/tasks/${taskId}/confirm-payment`);
      setShowCelebration(true);
      fetchData();
    } catch {
      Alert.alert(t('common.error'), t('taskDetails.alerts.failedPayment'));
    }
  };

  const submitReview = async () => {
    if (reviewRating === 0) return;
    const trimmed = reviewComment.trim();
    if (trimmed && containsProfanity(trimmed)) {
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(PROFANITY_ERROR_MESSAGE);
      } else {
        Alert.alert('Error', PROFANITY_ERROR_MESSAGE);
      }
      return;
    }
    try {
      await api.post(`/api/tasks/${taskId}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSubmitted(true);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string } }; status?: number };
      };
      // 409 → review already exists. Refresh from server so the UI reflects it.
      if (axiosErr.response?.status === 409) {
        setReviewSubmitted(true);
        fetchData();
        return;
      }
      const message =
        axiosErr.response?.data?.error?.message ?? 'Failed to submit review.';
      // Alert.alert on react-native-web only shows the title — combine so the
      // server-side error is actually visible.
      if (Platform.OS === 'web') {
        // eslint-disable-next-line no-alert
        window.alert(`${t('common.error')}: ${message}`);
      } else {
        Alert.alert(t('common.error'), message);
      }
    }
  };

  const openEditModal = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPrice(task.suggested_price?.toString() || '');
    setEditLocation(task.general_location_name);
    setEditAddress(task.exact_address);
    setShowEditModal(true);
  };

  // Auto-open edit modal when navigated from reactivate flow
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (openEdit && task && !didAutoOpen.current) {
      didAutoOpen.current = true;
      openEditModal();
    }
  }, [task, openEdit]);

  const saveEdit = async () => {
    try {
      await api.put(`/api/tasks/${taskId}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        suggested_price: editPrice ? parseFloat(editPrice) : null,
        general_location_name: editLocation.trim(),
        exact_address: editAddress.trim(),
      });
      setShowEditModal(false);
      fetchData();
    } catch {
      Alert.alert(t('common.error'), t('taskDetails.alerts.failedUpdate'));
    }
  };

  if (loading) {
    return <LoadingScreen label={t('taskDetails.loading')} />;
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={[typography.body]}>{t('taskDetails.notFound')}</Text>
      </View>
    );
  }

  const acceptedBid = bids.find((b) => b.status === 'ACCEPTED');
  const pendingBids = bids.filter((b) => b.status === 'PENDING');
  const banner = STATUS_BANNER[task.status];
  const catMeta = getCategoryMeta(task.category);

  // 14-day review window
  const reviewWindowDays = 14;
  const daysSinceCompleted = task.completed_at
    ? (Date.now() - new Date(task.completed_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const daysRemaining = Math.max(0, Math.ceil(reviewWindowDays - daysSinceCompleted));
  const reviewWindowExpired = task.completed_at ? daysSinceCompleted > reviewWindowDays : false;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <CelebrationOverlay fire={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* Status Banner + Edit button */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBanner, { backgroundColor: banner.bg }]}>
          <MaterialCommunityIcons name={banner.icon as never} size={20} color={banner.color} />
          <Text style={[typography.label, { color: banner.color }]}>
            {task.status.replace('_', ' ')}
          </Text>
        </View>
        {task.status === 'OPEN' && (
          <Pressable onPress={openEditModal} style={styles.editIconBtn}>
            <MaterialCommunityIcons name="pencil" size={18} color={brandColors.primaryMuted} />
          </Pressable>
        )}
      </View>

      {/* Photo Carousel */}
      {task.media_urls && task.media_urls.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoCarousel}
          style={styles.photoCarouselWrap}
        >
          {task.media_urls.map((url, idx) => (
            <Image
              key={idx}
              source={{ uri: url }}
              style={styles.photoItem}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {/* Title & Details Card */}
      <FCard style={styles.mainCard}>
        <Text style={[typography.h1, styles.title]}>{task.title}</Text>
        <Text style={[typography.body, styles.description]}>{task.description}</Text>

        <View style={styles.detailsDivider} />

        <DetailRow icon={catMeta.icon} iconColor={catMeta.color} label={t('taskDetails.detail.category')} value={getCategoryLabel(task.category as never, t)} />
        {task.urgency === 'TODAY' && (
          <DetailRow icon="clock-alert-outline" iconColor={brandColors.danger} label={t('taskDetails.detail.urgency')} value={t('taskDetails.detail.urgencyToday')} />
        )}
        {task.urgency === 'THIS_WEEK' && (
          <DetailRow icon="calendar-week" iconColor={brandColors.warning} label={t('taskDetails.detail.urgency')} value={t('taskDetails.detail.urgencyThisWeek')} />
        )}
        <DetailRow icon="cash-multiple" label={t('taskDetails.detail.budget')} value={task.suggested_price ? `₪${task.suggested_price}` : t('taskDetails.detail.quoteRequired')} />
        <DetailRow icon="map-marker-outline" label={t('taskDetails.detail.location')} value={task.general_location_name} />
        {task.status !== 'OPEN' && (
          <DetailRow icon="home-outline" label={t('taskDetails.detail.address')} value={task.exact_address} />
        )}
        <DetailRow
          icon="calendar-outline"
          label={t('taskDetails.detail.posted')}
          value={new Date(task.created_at).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        />
      </FCard>

      {/* OPEN: Bids Section */}
      {task.status === 'OPEN' && (
        <View style={styles.section}>
          <FSectionHeader title={t('taskDetails.sections.receivedBids')} count={pendingBids.length} />

          {pendingBids.length === 0 ? (
            <FCard style={styles.emptyBidsCard}>
              <View style={styles.emptyBidsContent}>
                <MaterialCommunityIcons name="clock-outline" size={28} color={brandColors.textMuted} />
                <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center' }]}>
                  {t('taskDetails.bids.emptyMessage')}
                </Text>
              </View>
            </FCard>
          ) : (
            pendingBids.map((bid) => (
              <FCard key={bid.id} style={styles.bidCard}>
                <View style={styles.bidTop}>
                  <Pressable
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md }}
                    onPress={() => navigation.navigate('PublicProfile', { userId: bid.fixer_id })}
                  >
                  <Avatar.Icon size={44} icon="account" style={{ backgroundColor: brandColors.primaryMuted }} />
                  <View style={styles.bidInfo}>
                    <Text style={[typography.h3, { color: brandColors.textPrimary }]}>
                      {bid.fixer?.full_name || 'Fixer'}
                    </Text>
                    {bid.fixer?.average_rating_as_fixer != null ? (
                      <View style={styles.ratingRow}>
                        <StarRating rating={bid.fixer.average_rating_as_fixer} size={14} />
                        <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
                          {bid.fixer.average_rating_as_fixer.toFixed(1)}
                        </Text>
                        <Pressable onPress={() => showReviewsForFixer(bid.fixer_id)}>
                          <Text style={[typography.caption, { color: brandColors.primaryMuted }]}>{t('taskDetails.bids.seeReviews')}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={[typography.caption, { color: brandColors.textMuted }]}>{t('taskDetails.bids.noReviewsYet')}</Text>
                    )}
                    {bid.is_repeat_customer && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MaterialCommunityIcons name="account-check" size={14} color={brandColors.primary} />
                        <Text style={[typography.caption, { color: brandColors.primary }]}>
                          Worked together {bid.previous_tasks_together} time{(bid.previous_tasks_together ?? 0) !== 1 ? 's' : ''} before
                        </Text>
                      </View>
                    )}
                  </View>
                  </Pressable>
                  <View style={styles.bidPriceTag}>
                    <Text style={[typography.h2, { color: brandColors.primary }]}>₪{bid.offered_price}</Text>
                  </View>
                </View>

                <Text style={[typography.bodySm, styles.bidPitch]} numberOfLines={2}>
                  {bid.description}
                </Text>

                <View style={styles.bidActions}>
                  <FButton variant="primary" size="sm" icon="check" onPress={() => acceptBid(bid.id)} style={{ flex: 1 }}>
                    {t('taskDetails.actions.acceptBid')}
                  </FButton>
                  <FButton variant="outline" size="sm" icon="close" onPress={() => openDeclineModal(bid.id)} style={{ flex: 1 }}>
                    {t('taskDetails.actions.decline')}
                  </FButton>
                </View>
                <FButton
                  variant="outline"
                  size="sm"
                  icon="chat-outline"
                  onPress={() => navigation.navigate('Chat', {
                    taskId: task.id,
                    myDbId: task.requester_id,
                    recipientId: bid.fixer_id,
                    recipientName: bid.fixer?.full_name || 'Fixer',
                    recipientAvatar: bid.fixer?.avatar_url || null,
                    taskTitle: task.title,
                    taskStatus: task.status,
                  })}
                  style={{ marginTop: spacing.xs }}
                >
                  {t('taskDetails.actions.chatWithBidder')}
                </FButton>
              </FCard>
            ))
          )}

          <Pressable onPress={cancelTask} style={styles.cancelRow}>
            <MaterialCommunityIcons name="close-circle-outline" size={16} color={brandColors.danger} />
            <Text style={[typography.label, { color: brandColors.danger }]}>{t('taskDetails.actions.cancelTask')}</Text>
          </Pressable>
        </View>
      )}

      {/* IN_PROGRESS: Assigned Fixer */}
      {task.status === 'IN_PROGRESS' && acceptedBid && (
        <View style={styles.section}>
          <FSectionHeader title={t('taskDetails.sections.assignedFixer')} accentColor={brandColors.primaryMuted} />

          <FCard style={styles.fixerCard}>
            <View style={styles.bidTop}>
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md }}
                onPress={() => navigation.navigate('PublicProfile', { userId: acceptedBid.fixer_id })}
              >
              <Avatar.Icon size={52} icon="account" style={{ backgroundColor: brandColors.primaryMuted }} />
              <View style={styles.bidInfo}>
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>
                  {acceptedBid.fixer?.full_name || 'Fixer'}
                </Text>
                {acceptedBid.fixer?.average_rating_as_fixer != null ? (
                  <View style={styles.ratingRow}>
                    <StarRating rating={acceptedBid.fixer.average_rating_as_fixer} size={14} />
                    <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
                      {acceptedBid.fixer.average_rating_as_fixer.toFixed(1)}
                    </Text>
                    <Pressable onPress={() => showReviewsForFixer(acceptedBid.fixer_id)}>
                      <Text style={[typography.caption, { color: brandColors.primaryMuted }]}>see reviews</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>{t('taskDetails.bids.noReviewsYet')}</Text>
                )}
                {acceptedBid.fixer?.phone_number && (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${acceptedBid.fixer!.phone_number}`)}
                    style={styles.phoneRow}
                  >
                    <MaterialCommunityIcons name="phone-outline" size={14} color={brandColors.primaryMuted} />
                    <Text style={[typography.bodySm, { color: brandColors.primaryMuted }]}>
                      {acceptedBid.fixer.phone_number}
                    </Text>
                  </Pressable>
                )}
              </View>
              </Pressable>
              <Text style={[typography.h2, { color: brandColors.primary }]}>₪{acceptedBid.offered_price}</Text>
            </View>
          </FCard>

          <View style={styles.actionButtons}>
            <FButton variant="primary" icon="check-circle-outline" onPress={markCompleted} fullWidth>
              {t('taskDetails.actions.markCompleted')}
            </FButton>
            <FButton
              variant="outline"
              icon="chat-outline"
              onPress={() => navigation.navigate('Chat', {
                taskId: task.id,
                myDbId: task.requester_id,
                recipientId: acceptedBid.fixer_id,
                recipientName: acceptedBid.fixer?.full_name || 'Fixer',
                recipientAvatar: acceptedBid.fixer?.avatar_url || null,
                taskTitle: task.title,
                taskStatus: task.status,
              })}
              fullWidth
            >
              {t('taskDetails.actions.chatWithFixer')}
            </FButton>
            <Pressable onPress={cancelTask} style={styles.cancelRow}>
              <MaterialCommunityIcons name="close-circle-outline" size={16} color={brandColors.danger} />
              <Text style={[typography.label, { color: brandColors.danger }]}>{t('taskDetails.actions.cancelTask')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Edit Task Modal */}
      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={styles.editModal}
        >
          <Text style={[typography.h2, { color: brandColors.textPrimary, marginBottom: spacing.lg }]}>
            {t('taskDetails.editModal.title')}
          </Text>
          <FInput label={t('taskDetails.editModal.titleLabel')} value={editTitle} onChangeText={setEditTitle} maxLength={200} />
          <FInput label={t('taskDetails.editModal.descriptionLabel')} value={editDescription} onChangeText={setEditDescription} multiline numberOfLines={4} maxLength={2000} />
          <FInput label={t('taskDetails.editModal.budgetLabel')} value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" />
          <FInput label={t('taskDetails.editModal.locationLabel')} value={editLocation} onChangeText={setEditLocation} />
          <FInput label={t('taskDetails.editModal.addressLabel')} value={editAddress} onChangeText={setEditAddress} />
          <FButton onPress={saveEdit} fullWidth style={{ marginTop: spacing.md }}>
            {t('taskDetails.editModal.saveChanges')}
          </FButton>
          <FButton variant="outline" onPress={() => setShowEditModal(false)} fullWidth style={{ marginTop: spacing.sm }}>
            {t('common.cancel')}
          </FButton>
        </Modal>
      </Portal>

      {/* Fixer Reviews Modal */}
      <Portal>
        <Modal
          visible={showFixerReviews}
          onDismiss={() => setShowFixerReviews(false)}
          contentContainerStyle={styles.reviewsModal}
        >
          <Text style={[typography.h2, { color: brandColors.textPrimary, marginBottom: spacing.lg }]}>
            {t('taskDetails.fixerReviews.title')}
          </Text>
          {fixerReviews.length === 0 ? (
            <Text style={[typography.body, { color: brandColors.textMuted }]}>{t('taskDetails.fixerReviews.noReviews')}</Text>
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {fixerReviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.ratingRow}>
                    <StarRating rating={review.rating} size={14} />
                    <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
                      {review.reviewer?.full_name || t('publicProfile.anonymous')}
                    </Text>
                  </View>
                  {review.comment && (
                    <Text style={[typography.bodySm, { color: brandColors.textSecondary, marginTop: spacing.xs }]}>
                      {review.comment}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
          <FButton
            variant="outline"
            onPress={() => setShowFixerReviews(false)}
            style={{ marginTop: spacing.lg }}
            fullWidth
          >
            {t('common.close')}
          </FButton>
        </Modal>
      </Portal>

      {/* Decline Bid Modal */}
      <Portal>
        <Modal
          visible={rejectingBidId !== null}
          onDismiss={() => setRejectingBidId(null)}
          contentContainerStyle={styles.editModal}
        >
          <Text style={[typography.h2, { color: brandColors.textPrimary, marginBottom: spacing.md }]}>
            Decline Bid
          </Text>
          <Text style={[typography.bodySm, { color: brandColors.textMuted, marginBottom: spacing.md }]}>
            Select a reason so the fixer can improve future bids.
          </Text>
          {([
            ['PRICE_TOO_HIGH', 'Price too high'],
            ['BAD_TIMING', 'Bad timing'],
            ['CHOSE_ANOTHER', 'Chose another fixer'],
            ['NOT_QUALIFIED', 'Not the right fit'],
            ['OTHER', 'Other'],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              style={[
                styles.reasonOption,
                rejectionReason === value && styles.reasonOptionSelected,
              ]}
              onPress={() => setRejectionReason(value)}
            >
              <MaterialCommunityIcons
                name={rejectionReason === value ? 'radiobox-marked' : 'radiobox-blank'}
                size={20}
                color={rejectionReason === value ? brandColors.primary : brandColors.textMuted}
              />
              <Text style={[
                typography.body,
                { color: rejectionReason === value ? brandColors.primary : brandColors.textPrimary },
              ]}>
                {label}
              </Text>
            </Pressable>
          ))}
          <FInput
            label="Note (optional)"
            value={rejectionNote}
            onChangeText={setRejectionNote}
            multiline
            numberOfLines={2}
            maxLength={500}
            placeholder="Add details if you'd like..."
          />
          <FButton
            onPress={confirmDeclineBid}
            disabled={!rejectionReason}
            fullWidth
            style={{ marginTop: spacing.md }}
          >
            Confirm Decline
          </FButton>
          <FButton variant="outline" onPress={() => setRejectingBidId(null)} fullWidth style={{ marginTop: spacing.sm }}>
            Cancel
          </FButton>
        </Modal>
      </Portal>

      {/* Completion Photos (shown for IN_PROGRESS and COMPLETED) */}
      {(task.status === 'IN_PROGRESS' || task.status === 'COMPLETED') && (task.completion_photos?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <FSectionHeader title="Completion Photos" accentColor={brandColors.primary} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {task.completion_photos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={{ width: 100, height: 100, borderRadius: radii.md }} />
            ))}
          </View>
        </View>
      )}

      {/* COMPLETED: Payment & Review */}
      {task.status === 'COMPLETED' && (
        <View style={styles.section}>
          {/* Payment */}
          <FSectionHeader title={t('taskDetails.sections.payment')} accentColor={brandColors.success} />
          <FCard style={styles.paymentCard}>
            {task.is_payment_confirmed ? (
              <View style={styles.confirmedRow}>
                <View style={styles.confirmedIcon}>
                  <MaterialCommunityIcons name="check" size={20} color={brandColors.white} />
                </View>
                <Text style={[typography.h3, { color: brandColors.success }]}>{t('taskDetails.payment.confirmed')}</Text>
              </View>
            ) : (
              <View style={styles.paymentActions}>
                {acceptedBid?.fixer?.payment_link ? (
                  <>
                    <FButton
                      variant="primary"
                      icon="open-in-new"
                      onPress={() => Linking.openURL(acceptedBid.fixer!.payment_link!)}
                      fullWidth
                    >
                      {t('taskDetails.actions.payFixer')}
                    </FButton>
                    <FButton variant="outline" onPress={confirmPayment} fullWidth>
                      {t('taskDetails.actions.confirmPayment')}
                    </FButton>
                  </>
                ) : (
                  <View style={styles.noPaymentLink}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={brandColors.textMuted} />
                    <Text style={[typography.body, { color: brandColors.textMuted, flex: 1 }]}>
                      {t('taskDetails.payment.noPaymentLink')}
                    </Text>
                    {acceptedBid?.fixer?.phone_number && (
                      <Pressable onPress={() => Linking.openURL(`tel:${acceptedBid.fixer!.phone_number}`)}>
                        <Text style={[typography.label, { color: brandColors.primaryMuted }]}>
                          {acceptedBid.fixer.phone_number}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            )}
          </FCard>

          {/* Review */}
          <FSectionHeader title={t('taskDetails.sections.review')} accentColor={brandColors.secondary} style={{ marginTop: spacing.xxl }} />
          <FCard>
            {reviewSubmitted ? (
              <View style={styles.confirmedRow}>
                <View style={[styles.confirmedIcon, { backgroundColor: brandColors.secondary }]}>
                  <MaterialCommunityIcons name="star" size={20} color={brandColors.white} />
                </View>
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{t('taskDetails.review.thankYou')}</Text>
              </View>
            ) : reviewWindowExpired ? (
              <View style={styles.reviewExpired}>
                <MaterialCommunityIcons name="clock-alert-outline" size={24} color={brandColors.textMuted} />
                <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center' }]}>
                  {t('taskDetails.review.windowExpired')}
                </Text>
              </View>
            ) : (
              <View style={styles.reviewForm}>
                <View style={styles.reviewWindowBanner}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={brandColors.primaryMuted} />
                  <Text style={[typography.caption, { color: brandColors.primaryMuted }]}>
                    {t('taskDetails.review.daysLeft', { count: daysRemaining })}
                  </Text>
                </View>
                <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>{t('taskDetails.review.rateFixer')}</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setReviewRating(star)}
                      hitSlop={4}
                    >
                      <MaterialCommunityIcons
                        name={star <= reviewRating ? 'star' : 'star-outline'}
                        size={36}
                        color={star <= reviewRating ? brandColors.secondary : brandColors.outline}
                      />
                    </Pressable>
                  ))}
                </View>
                <FInput
                  label={t('taskDetails.review.comment')}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={3}
                  maxLength={2000}
                />
                <FButton
                  onPress={submitReview}
                  disabled={reviewRating === 0}
                  fullWidth
                  icon="send"
                >
                  {t('taskDetails.review.submit')}
                </FButton>
              </View>
            )}
          </FCard>
        </View>
      )}

      {/* CANCELED: Reopen */}
      {task.status === 'CANCELED' && (
        <View style={styles.section}>
          <FSectionHeader title="Canceled" accentColor={brandColors.danger} />
          <FCard>
            <View style={styles.canceledContent}>
              <MaterialCommunityIcons
                name="refresh"
                size={28}
                color={brandColors.textMuted}
              />
              <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center' }]}>
                This task was canceled. Reopen it to re-post it to the discovery feed for fixers to bid on again.
              </Text>
              <FButton onPress={reopenTask} fullWidth icon="refresh">
                Reopen Task
              </FButton>
            </View>
          </FCard>
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({
  icon,
  iconColor = brandColors.primaryMuted,
  label,
  value,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconShell}>
        <MaterialCommunityIcons name={icon as never} size={18} color={iconColor} />
      </View>
      <View style={styles.detailText}>
        <Text style={[typography.caption, { color: brandColors.textMuted }]}>{label}</Text>
        <Text style={[typography.body, { color: brandColors.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
    backgroundColor: brandColors.background,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  editIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mainCard: {
    marginBottom: spacing.lg,
  },
  title: {
    color: brandColors.textPrimary,
    marginBottom: spacing.md,
  },
  description: {
    color: brandColors.textSecondary,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: brandColors.outlineLight,
    marginVertical: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailIconShell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    flex: 1,
    gap: 2,
  },

  section: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },

  emptyBidsCard: {
    alignItems: 'center',
  },
  emptyBidsContent: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },

  bidCard: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  bidTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bidInfo: {
    flex: 1,
    gap: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bidPriceTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: brandColors.infoSoft,
  },
  bidPitch: {
    color: brandColors.textMuted,
    fontStyle: 'italic',
  },
  bidActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  cancelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },

  fixerCard: {
    marginBottom: spacing.lg,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionButtons: {
    gap: spacing.sm,
  },

  paymentCard: {
    marginBottom: spacing.md,
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  confirmedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brandColors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentActions: {
    gap: spacing.md,
  },
  noPaymentLink: {
    gap: spacing.md,
  },

  reviewForm: {
    gap: spacing.lg,
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reviewsModal: {
    backgroundColor: brandColors.surface,
    padding: spacing.xl,
    margin: spacing.xl,
    borderRadius: radii.xl,
    maxWidth: 500,
    alignSelf: 'center',
    width: '90%',
  },
  reviewItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.outlineLight,
  },
  photoCarouselWrap: {
    marginBottom: spacing.lg,
  },
  photoCarousel: {
    gap: spacing.md,
  },
  photoItem: {
    width: 240,
    height: 160,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surfaceAlt,
  },
  reviewWindowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: brandColors.infoSoft,
    alignSelf: 'flex-start',
  },
  reviewExpired: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  canceledContent: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  editModal: {
    backgroundColor: brandColors.surface,
    padding: spacing.xl,
    margin: spacing.xl,
    borderRadius: radii.xl,
    maxWidth: 500,
    alignSelf: 'center',
    width: '90%',
    gap: spacing.md,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    marginBottom: spacing.xs,
  },
  reasonOptionSelected: {
    borderColor: brandColors.primary,
    backgroundColor: brandColors.infoSoft,
  },
});
