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
import api from '../api/axiosInstance';
import LoadingScreen from '../components/LoadingScreen';
import { FButton, FCard, FInput, FSectionHeader } from '../components/ui';
import { brandColors, spacing, radii, typography } from '../theme';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

interface Bid {
  id: string;
  fixer_id: string;
  offered_price: number;
  description: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  fixer?: {
    full_name: string;
    average_rating_as_fixer: number | null;
    phone_number: string | null;
    payment_link: string | null;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  status: TaskStatus;
  suggested_price: number | null;
  general_location_name: string;
  exact_address: string;
  media_urls: string[];
  is_payment_confirmed: boolean;
  created_at: string;
  completed_at: string | null;
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

  const showReviewsForFixer = async (fixerId: string) => {
    try {
      const res = await api.get(`/api/users/${fixerId}/reviews`);
      setFixerReviews(res.data.reviews || []);
      setShowFixerReviews(true);
    } catch {
      Alert.alert('Error', 'Failed to load reviews.');
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [taskRes, bidsRes] = await Promise.all([
        api.get(`/api/tasks/${taskId}`),
        api.get(`/api/tasks/${taskId}/bids`),
      ]);
      setTask(taskRes.data.task);
      setBids(bidsRes.data.bids || []);
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
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to accept bid.');
    }
  };

  const declineBid = async (bidId: string) => {
    try {
      await api.put(`/api/bids/${bidId}/reject`);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to decline bid.');
    }
  };

  const cancelTask = async () => {
    const doCancel = async () => {
      try {
        await api.put(`/api/tasks/${taskId}/status`, { status: 'CANCELED' });
        navigation.goBack();
      } catch {
        Alert.alert('Error', 'Failed to cancel task.');
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm('Are you sure you want to cancel this task?')) {
        doCancel();
      }
    } else {
      Alert.alert('Cancel Task', 'Are you sure you want to cancel this task?', [
        { text: 'No' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  const markCompleted = async () => {
    try {
      await api.put(`/api/tasks/${taskId}/status`, { status: 'COMPLETED' });
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to mark task as completed.');
    }
  };

  const confirmPayment = async () => {
    try {
      await api.put(`/api/tasks/${taskId}/confirm-payment`);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to confirm payment.');
    }
  };

  const submitReview = async () => {
    if (reviewRating === 0) return;
    try {
      await api.post(`/api/tasks/${taskId}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSubmitted(true);
    } catch {
      Alert.alert('Error', 'Failed to submit review.');
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
      Alert.alert('Error', 'Failed to update task.');
    }
  };

  if (loading) {
    return <LoadingScreen label="Loading task details..." />;
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={[typography.body]}>Task not found</Text>
      </View>
    );
  }

  const acceptedBid = bids.find((b) => b.status === 'ACCEPTED');
  const pendingBids = bids.filter((b) => b.status === 'PENDING');
  const banner = STATUS_BANNER[task.status];

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

        <DetailRow icon="cash-multiple" label="Budget" value={task.suggested_price ? `₪${task.suggested_price}` : 'Quote Required'} />
        <DetailRow icon="map-marker-outline" label="Location" value={task.general_location_name} />
        {task.status !== 'OPEN' && (
          <DetailRow icon="home-outline" label="Address" value={task.exact_address} />
        )}
        <DetailRow
          icon="calendar-outline"
          label="Posted"
          value={new Date(task.created_at).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        />
      </FCard>

      {/* OPEN: Bids Section */}
      {task.status === 'OPEN' && (
        <View style={styles.section}>
          <FSectionHeader title="Received Bids" count={pendingBids.length} />

          {pendingBids.length === 0 ? (
            <FCard style={styles.emptyBidsCard}>
              <View style={styles.emptyBidsContent}>
                <MaterialCommunityIcons name="clock-outline" size={28} color={brandColors.textMuted} />
                <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center' }]}>
                  No bids yet. Fixers in your area will see your task!
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
                          <Text style={[typography.caption, { color: brandColors.primaryMuted }]}>see reviews</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={[typography.caption, { color: brandColors.textMuted }]}>No reviews yet</Text>
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
                    Accept
                  </FButton>
                  <FButton variant="outline" size="sm" icon="close" onPress={() => declineBid(bid.id)} style={{ flex: 1 }}>
                    Decline
                  </FButton>
                </View>
              </FCard>
            ))
          )}

          <Pressable onPress={cancelTask} style={styles.cancelRow}>
            <MaterialCommunityIcons name="close-circle-outline" size={16} color={brandColors.danger} />
            <Text style={[typography.label, { color: brandColors.danger }]}>Cancel Task</Text>
          </Pressable>
        </View>
      )}

      {/* IN_PROGRESS: Assigned Fixer */}
      {task.status === 'IN_PROGRESS' && acceptedBid && (
        <View style={styles.section}>
          <FSectionHeader title="Assigned Fixer" accentColor={brandColors.primaryMuted} />

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
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>No reviews yet</Text>
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
              Mark as Completed
            </FButton>
            <Pressable onPress={cancelTask} style={styles.cancelRow}>
              <MaterialCommunityIcons name="close-circle-outline" size={16} color={brandColors.danger} />
              <Text style={[typography.label, { color: brandColors.danger }]}>Cancel Task</Text>
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
            Edit Task
          </Text>
          <FInput label="Title" value={editTitle} onChangeText={setEditTitle} maxLength={200} />
          <FInput label="Description" value={editDescription} onChangeText={setEditDescription} multiline numberOfLines={4} maxLength={2000} />
          <FInput label="Budget (₪)" value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" />
          <FInput label="General location" value={editLocation} onChangeText={setEditLocation} />
          <FInput label="Exact address" value={editAddress} onChangeText={setEditAddress} />
          <FButton onPress={saveEdit} fullWidth style={{ marginTop: spacing.md }}>
            Save Changes
          </FButton>
          <FButton variant="outline" onPress={() => setShowEditModal(false)} fullWidth style={{ marginTop: spacing.sm }}>
            Cancel
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
            Fixer Reviews
          </Text>
          {fixerReviews.length === 0 ? (
            <Text style={[typography.body, { color: brandColors.textMuted }]}>No reviews yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {fixerReviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.ratingRow}>
                    <StarRating rating={review.rating} size={14} />
                    <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
                      {review.reviewer?.full_name || 'Anonymous'}
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
            Close
          </FButton>
        </Modal>
      </Portal>

      {/* COMPLETED: Payment & Review */}
      {task.status === 'COMPLETED' && (
        <View style={styles.section}>
          {/* Payment */}
          <FSectionHeader title="Payment" accentColor={brandColors.success} />
          <FCard style={styles.paymentCard}>
            {task.is_payment_confirmed ? (
              <View style={styles.confirmedRow}>
                <View style={styles.confirmedIcon}>
                  <MaterialCommunityIcons name="check" size={20} color={brandColors.white} />
                </View>
                <Text style={[typography.h3, { color: brandColors.success }]}>Payment Confirmed</Text>
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
                      Pay Fixer
                    </FButton>
                    <FButton variant="outline" onPress={confirmPayment} fullWidth>
                      Confirm Payment
                    </FButton>
                  </>
                ) : (
                  <View style={styles.noPaymentLink}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={brandColors.textMuted} />
                    <Text style={[typography.body, { color: brandColors.textMuted, flex: 1 }]}>
                      This Fixer hasn't set up a payment link. Contact them directly.
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
          <FSectionHeader title="Review" accentColor={brandColors.secondary} style={{ marginTop: spacing.xxl }} />
          <FCard>
            {reviewSubmitted ? (
              <View style={styles.confirmedRow}>
                <View style={[styles.confirmedIcon, { backgroundColor: brandColors.secondary }]}>
                  <MaterialCommunityIcons name="star" size={20} color={brandColors.white} />
                </View>
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>Review submitted. Thank you!</Text>
              </View>
            ) : reviewWindowExpired ? (
              <View style={styles.reviewExpired}>
                <MaterialCommunityIcons name="clock-alert-outline" size={24} color={brandColors.textMuted} />
                <Text style={[typography.body, { color: brandColors.textMuted, textAlign: 'center' }]}>
                  The 14-day review window has expired. You can no longer leave a review for this task.
                </Text>
              </View>
            ) : (
              <View style={styles.reviewForm}>
                <View style={styles.reviewWindowBanner}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={brandColors.primaryMuted} />
                  <Text style={[typography.caption, { color: brandColors.primaryMuted }]}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left to leave a review
                  </Text>
                </View>
                <Text style={[typography.bodyMedium, { color: brandColors.textPrimary }]}>Rate the fixer:</Text>
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
                  label="Comment (optional)"
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
                  Submit Review
                </FButton>
              </View>
            )}
          </FCard>
        </View>
      )}
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconShell}>
        <MaterialCommunityIcons name={icon as never} size={18} color={brandColors.primaryMuted} />
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
    borderRadius: radii.md,
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
    borderRadius: radii.sm,
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
});
