import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking, Pressable } from 'react-native';
import {
  Text,
  Avatar,
  IconButton,
  Divider,
  Portal,
  Modal,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import { FButton, FCard, FInput, FSectionHeader } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

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
  is_payment_confirmed: boolean;
  created_at: string;
}

const STATUS_BANNER: Record<TaskStatus, { bg: string; color: string; icon: string }> = {
  OPEN: { bg: brandColors.successSoft, color: brandColors.success, icon: 'progress-clock' },
  IN_PROGRESS: { bg: brandColors.infoSoft, color: brandColors.primaryMuted, icon: 'progress-wrench' },
  COMPLETED: { bg: brandColors.surfaceAlt, color: brandColors.textMuted, icon: 'check-circle-outline' },
  CANCELED: { bg: brandColors.dangerSoft, color: brandColors.danger, icon: 'close-circle-outline' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TaskDetails({ route, navigation }: { route: any; navigation: any }) {
  const { taskId } = route.params;
  const [task, setTask] = useState<Task | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

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
    Alert.alert('Cancel Task', 'Are you sure you want to cancel this task?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/api/tasks/${taskId}/status`, { status: 'CANCELED' });
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to cancel task.');
          }
        },
      },
    ]);
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

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: banner.bg }]}>
        <MaterialCommunityIcons name={banner.icon as never} size={20} color={banner.color} />
        <Text style={[typography.label, { color: banner.color }]}>
          {task.status.replace('_', ' ')}
        </Text>
      </View>

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
                  <Avatar.Icon size={44} icon="account" style={{ backgroundColor: brandColors.primaryMuted }} />
                  <View style={styles.bidInfo}>
                    <Text style={[typography.h3, { color: brandColors.textPrimary }]}>
                      {bid.fixer?.full_name || 'Fixer'}
                    </Text>
                    {bid.fixer?.average_rating_as_fixer != null && (
                      <View style={styles.ratingRow}>
                        <MaterialCommunityIcons name="star" size={14} color={brandColors.secondary} />
                        <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
                          {bid.fixer.average_rating_as_fixer.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
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
              <Avatar.Icon size={52} icon="account" style={{ backgroundColor: brandColors.primaryMuted }} />
              <View style={styles.bidInfo}>
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>
                  {acceptedBid.fixer?.full_name || 'Fixer'}
                </Text>
                {acceptedBid.fixer?.average_rating_as_fixer != null && (
                  <View style={styles.ratingRow}>
                    <MaterialCommunityIcons name="star" size={14} color={brandColors.secondary} />
                    <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
                      {acceptedBid.fixer.average_rating_as_fixer.toFixed(1)}
                    </Text>
                  </View>
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
            ) : (
              <View style={styles.reviewForm}>
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

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
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
});
