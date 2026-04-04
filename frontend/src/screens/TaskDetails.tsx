import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking, Platform } from 'react-native';
import {
  Text,
  Button,
  Card,
  useTheme,
  Divider,
  Avatar,
  Icon,
  IconButton,
  TextInput,
  Portal,
  Modal,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import { brandColors } from '../theme';

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Icon
          key={s}
          source={s <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={brandColors.secondary}
        />
      ))}
    </View>
  );
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TaskDetails({ route, navigation }: { route: any; navigation: any }) {
  const theme = useTheme();
  const { taskId } = route.params;
  const [task, setTask] = useState<Task | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [fixerReviews, setFixerReviews] = useState<{ rating: number; comment: string | null; reviewer?: { full_name: string } }[]>([]);
  const [showFixerReviews, setShowFixerReviews] = useState(false);

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
      if (window.confirm('Are you sure you want to cancel this task?')) {
        await doCancel();
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

  const showReviewsForFixer = async (fixerId: string) => {
    try {
      const res = await api.get(`/api/users/${fixerId}/reviews`);
      setFixerReviews(res.data.reviews || []);
      setShowFixerReviews(true);
    } catch {
      setFixerReviews([]);
      setShowFixerReviews(true);
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
        <Text variant="bodyLarge">Task not found</Text>
      </View>
    );
  }

  const acceptedBid = bids.find((b) => b.status === 'ACCEPTED');
  const pendingBids = bids.filter((b) => b.status === 'PENDING');

  return (
    <>
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>{task.title}</Text>
        <StatusBadge status={task.status} />
      </View>

      {/* Details */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="bodyMedium">{task.description}</Text>
          <Divider style={styles.divider} />
          <View style={styles.detailRow}>
            <Text variant="labelLarge">Budget:</Text>
            <Text variant="bodyMedium">
              {task.suggested_price ? `₪${task.suggested_price}` : 'Quote Required'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text variant="labelLarge">Location:</Text>
            <Text variant="bodyMedium">{task.general_location_name}</Text>
          </View>
          {task.status !== 'OPEN' && (
            <View style={styles.detailRow}>
              <Text variant="labelLarge">Address:</Text>
              <Text variant="bodyMedium">{task.exact_address}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* OPEN — Bids Section */}
      {task.status === 'OPEN' && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Received Bids ({pendingBids.length})
          </Text>
          {pendingBids.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  No bids yet. Sit tight — Fixers in your area will see your task!
                </Text>
              </Card.Content>
            </Card>
          ) : (
            pendingBids.map((bid) => (
              <Card key={bid.id} style={styles.bidCard}>
                <Card.Content>
                  <View style={styles.bidHeader}>
                    <Avatar.Icon size={40} icon="account" />
                    <View style={styles.bidInfo}>
                      <Text variant="titleSmall">{bid.fixer?.full_name || 'Fixer'}</Text>
                      {bid.fixer?.average_rating_as_fixer ? (
                        <View style={styles.ratingRow}>
                          <StarRating rating={bid.fixer.average_rating_as_fixer} />
                          <Text
                            variant="bodySmall"
                            style={styles.ratingLink}
                            onPress={() => showReviewsForFixer(bid.fixer_id)}
                          >
                            {bid.fixer.average_rating_as_fixer.toFixed(1)} — see reviews
                          </Text>
                        </View>
                      ) : (
                        <Text variant="bodySmall" style={{ color: brandColors.textMuted }}>No reviews yet</Text>
                      )}
                    </View>
                    <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                      ₪{bid.offered_price}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.bidDesc} numberOfLines={2}>
                    {bid.description}
                  </Text>
                  <View style={styles.bidActions}>
                    <Button
                      mode="contained"
                      buttonColor={brandColors.success}
                      compact
                      onPress={() => acceptBid(bid.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      mode="outlined"
                      textColor={brandColors.danger}
                      compact
                      onPress={() => declineBid(bid.id)}
                    >
                      Decline
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
          <Button
            mode="text"
            textColor={brandColors.danger}
            onPress={cancelTask}
            style={styles.cancelButton}
          >
            Cancel Task
          </Button>
        </View>
      )}

      {/* IN_PROGRESS — Assigned Fixer */}
      {task.status === 'IN_PROGRESS' && acceptedBid && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Assigned Fixer</Text>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.bidHeader}>
                <Avatar.Icon size={48} icon="account" />
                <View style={styles.bidInfo}>
                  <Text variant="titleSmall">{acceptedBid.fixer?.full_name || 'Fixer'}</Text>
                  {acceptedBid.fixer?.average_rating_as_fixer ? (
                    <View style={styles.ratingRow}>
                      <StarRating rating={acceptedBid.fixer.average_rating_as_fixer} />
                      <Text
                        variant="bodySmall"
                        style={styles.ratingLink}
                        onPress={() => showReviewsForFixer(acceptedBid.fixer_id)}
                      >
                        {acceptedBid.fixer.average_rating_as_fixer.toFixed(1)} — see reviews
                      </Text>
                    </View>
                  ) : (
                    <Text variant="bodySmall" style={{ color: brandColors.textMuted }}>No reviews yet</Text>
                  )}
                  {acceptedBid.fixer?.phone_number && (
                    <Text
                      variant="bodySmall"
                      style={styles.phone}
                      onPress={() => Linking.openURL(`tel:${acceptedBid.fixer!.phone_number}`)}
                    >
                      {acceptedBid.fixer.phone_number}
                    </Text>
                  )}
                </View>
                <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                  ₪{acceptedBid.offered_price}
                </Text>
              </View>
            </Card.Content>
          </Card>
          <Button
            mode="contained"
            buttonColor={brandColors.success}
            onPress={markCompleted}
            style={styles.actionButton}
          >
            Mark as Completed
          </Button>
          <Button
            mode="text"
            textColor={brandColors.danger}
            onPress={cancelTask}
          >
            Cancel Task
          </Button>
        </View>
      )}

      {/* COMPLETED — Payment & Review */}
      {task.status === 'COMPLETED' && (
        <View style={styles.section}>
          {/* Payment */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Payment</Text>
          <Card style={styles.card}>
            <Card.Content>
              {task.is_payment_confirmed ? (
                <Text variant="bodyMedium" style={styles.confirmed}>Payment Confirmed ✓</Text>
              ) : (
                <View>
                  {acceptedBid?.fixer?.payment_link ? (
                    <>
                      <Button
                        mode="contained"
                        onPress={() => Linking.openURL(acceptedBid.fixer!.payment_link!)}
                        style={styles.actionButton}
                      >
                        Pay Fixer
                      </Button>
                      <Button mode="outlined" onPress={confirmPayment}>
                        Confirm Payment
                      </Button>
                    </>
                  ) : (
                    <View>
                      <Text variant="bodyMedium">
                        This Fixer hasn't set up a payment link. Contact them directly.
                      </Text>
                      {acceptedBid?.fixer?.phone_number && (
                        <Text
                          variant="bodyMedium"
                          style={styles.phone}
                          onPress={() => Linking.openURL(`tel:${acceptedBid.fixer!.phone_number}`)}
                        >
                          {acceptedBid.fixer.phone_number}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Review */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Review</Text>
          <Card style={styles.card}>
            <Card.Content>
              {reviewSubmitted ? (
                <Text variant="bodyMedium" style={styles.confirmed}>Review submitted. Thank you!</Text>
              ) : (
                <View>
                  <Text variant="bodyMedium" style={{ marginBottom: 8 }}>Rate the fixer:</Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <IconButton
                        key={star}
                        icon={star <= reviewRating ? 'star' : 'star-outline'}
                        iconColor={star <= reviewRating ? brandColors.secondary : brandColors.textMuted}
                        size={32}
                        onPress={() => setReviewRating(star)}
                      />
                    ))}
                  </View>
                  <TextInput
                    label="Comment (optional)"
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    maxLength={2000}
                    style={styles.input}
                  />
                  <Button
                    mode="contained"
                    onPress={submitReview}
                    disabled={reviewRating === 0}
                  >
                    Submit Review
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        </View>
      )}
    </ScrollView>

      <Portal>
        <Modal visible={showFixerReviews} onDismiss={() => setShowFixerReviews(false)} contentContainerStyle={styles.reviewsModal}>
          <Text variant="titleLarge" style={styles.reviewsModalTitle}>Fixer Reviews</Text>
          {fixerReviews.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: brandColors.textMuted }}>No reviews yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {fixerReviews.map((r, i) => (
                <Card key={i} style={styles.reviewItemCard}>
                  <Card.Content>
                    <View style={styles.reviewItemHeader}>
                      <StarRating rating={r.rating} size={14} />
                      {r.reviewer?.full_name && (
                        <Text variant="bodySmall" style={{ color: brandColors.textMuted }}>
                          {r.reviewer.full_name}
                        </Text>
                      )}
                    </View>
                    {r.comment && (
                      <Text variant="bodyMedium" style={{ marginTop: 4 }}>{r.comment}</Text>
                    )}
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          )}
          <Button mode="text" onPress={() => setShowFixerReviews(false)} style={{ marginTop: 8 }}>
            Close
          </Button>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 16,
    paddingTop: 20,
    backgroundColor: brandColors.background,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 500,
    marginBottom: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: brandColors.surface,
  },
  title: {
    flex: 1,
    marginRight: 12,
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 12,
    borderRadius: 24,
    backgroundColor: brandColors.surface,
  },
  divider: {
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  section: {
    width: '100%',
    maxWidth: 500,
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
    color: brandColors.textPrimary,
  },
  bidCard: {
    marginBottom: 12,
    borderRadius: 22,
    backgroundColor: brandColors.surface,
  },
  bidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bidInfo: {
    flex: 1,
  },
  bidDesc: {
    marginTop: 8,
    color: brandColors.textMuted,
  },
  bidActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
  phone: {
    color: brandColors.primaryMuted,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  confirmed: {
    color: brandColors.success,
    fontWeight: '600',
  },
  stars: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  emptyText: {
    color: brandColors.textMuted,
    fontStyle: 'italic',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingLink: {
    color: brandColors.primaryMuted,
    textDecorationLine: 'underline',
  },
  reviewsModal: {
    backgroundColor: brandColors.surface,
    margin: 20,
    padding: 24,
    borderRadius: 24,
    maxHeight: '80%',
  },
  reviewsModalTitle: {
    marginBottom: 16,
    color: brandColors.textPrimary,
  },
  reviewItemCard: {
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: brandColors.background,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
