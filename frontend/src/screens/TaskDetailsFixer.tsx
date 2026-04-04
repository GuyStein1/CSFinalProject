import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Avatar,
  Button,
  Card,
  Divider,
  Icon,
  Modal,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { brandColors } from '../theme';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

interface TaskRequester {
  id: string;
  full_name: string;
  avatar_url: string | null;
  average_rating_as_fixer: number | null;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  status: TaskStatus;
  suggested_price: number | null;
  media_urls: string[];
  general_location_name: string;
  created_at: string;
  requester_id: string;
  requester?: TaskRequester;
  bid_count?: number;
}

interface ExistingBid {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  offered_price: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  ELECTRICITY: 'lightning-bolt',
  PLUMBING: 'water',
  CARPENTRY: 'hammer',
  PAINTING: 'format-paint',
  MOVING: 'truck',
  GENERAL: 'wrench',
};

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITY: 'Electricity',
  PLUMBING: 'Plumbing',
  CARPENTRY: 'Carpentry',
  PAINTING: 'Painting',
  MOVING: 'Moving',
  GENERAL: 'General',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_HEIGHT = 240;
const MAX_PITCH_LENGTH = 500;

interface Props {
  route: { params?: { taskId?: string } };
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export default function TaskDetailsFixer({ route, navigation }: Props) {
  const taskId = route.params?.taskId;

  const [task, setTask] = useState<Task | null>(null);
  const [existingBid, setExistingBid] = useState<ExistingBid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [bidPitch, setBidPitch] = useState('');
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

  const [carouselIndex, setCarouselIndex] = useState(0);

  const fetchData = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);

    try {
      const [taskRes, bidsRes] = await Promise.all([
        api.get(`/api/tasks/${taskId}`),
        api.get('/api/users/me/bids?limit=50'),
      ]);

      setTask(taskRes.data.task);

      const myBid = (bidsRes.data.bids ?? []).find(
        (b: { task_id: string }) => b.task_id === taskId,
      );
      setExistingBid(myBid ?? null);
    } catch {
      setError('Failed to load task details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const bidCount = task?.bid_count ?? 0;

  const bottomBarState = useMemo<'submit' | 'submitted' | 'closed'>(() => {
    if (!task) return 'closed';
    if (task.status !== 'OPEN') return 'closed';
    if (bidCount >= 15) return 'closed';
    if (existingBid && existingBid.status === 'PENDING') return 'submitted';
    return 'submit';
  }, [task, existingBid, bidCount]);

  const handleOpenBidModal = () => {
    setBidPrice('');
    setBidPitch('');
    setBidError(null);
    setBidModalVisible(true);
  };

  const handleSubmitBid = async () => {
    const price = parseFloat(bidPrice);
    if (isNaN(price) || price <= 0) {
      setBidError('Enter a valid price greater than ₪0.');
      return;
    }
    if (!bidPitch.trim()) {
      setBidError('Write a short pitch to the requester.');
      return;
    }

    setBidSubmitting(true);
    setBidError(null);

    try {
      const res = await api.post(`/api/tasks/${taskId}/bids`, {
        offered_price: price,
        description: bidPitch.trim(),
      });

      const bid = res.data.bid;
      setExistingBid({ id: bid.id, status: bid.status, offered_price: bid.offered_price });
      setBidModalVisible(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } }; status?: number } };
      if (axiosErr.response?.status === 409) {
        setBidError('This task has reached the maximum number of bids (15).');
      } else {
        setBidError(axiosErr.response?.data?.error?.message ?? 'Failed to submit bid. Please try again.');
      }
    } finally {
      setBidSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen label="Loading job details..." />;
  }

  if (error || !task) {
    return (
      <View style={styles.errorContainer}>
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          message={error ?? 'Task not found.'}
          actionLabel="Retry"
          onAction={fetchData}
        />
      </View>
    );
  }

  const budgetLabel = task.suggested_price != null ? `₪${task.suggested_price}` : 'Quote Required';
  const hasPhotos = task.media_urls && task.media_urls.length > 0;
  const categoryIcon = CATEGORY_ICONS[task.category] ?? 'wrench';
  const categoryLabel = CATEGORY_LABELS[task.category] ?? task.category;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photo Carousel */}
        {hasPhotos ? (
          <View>
            <FlatList
              data={task.media_urls}
              keyExtractor={(_, i) => `photo-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCarouselIndex(index);
              }}
              renderItem={({ item: uri }) => (
                <Image source={{ uri }} style={styles.carouselImage} resizeMode="cover" />
              )}
            />
            {task.media_urls.length > 1 && (
              <View style={styles.paginationRow}>
                {task.media_urls.map((_, i) => (
                  <View
                    key={`dot-${i}`}
                    style={[styles.dot, i === carouselIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholderCarousel}>
            <Icon source="image-off-outline" size={48} color={brandColors.textMuted} />
            <Text variant="bodySmall" style={styles.placeholderText}>
              No photos attached
            </Text>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Title + Status */}
          <View style={styles.titleRow}>
            <Text variant="headlineSmall" style={styles.title} numberOfLines={3}>
              {task.title}
            </Text>
            <StatusBadge status={task.status} />
          </View>

          {/* Category + Budget */}
          <View style={styles.chipRow}>
            <View style={styles.categoryChip}>
              <Icon source={categoryIcon} size={16} color={brandColors.primary} />
              <Text variant="labelMedium" style={styles.categoryText}>
                {categoryLabel}
              </Text>
            </View>
            <Text variant="titleMedium" style={styles.budget}>
              {budgetLabel}
            </Text>
          </View>

          <Divider style={styles.divider} />

          {/* Description */}
          <Text variant="bodyMedium" style={styles.description}>
            {task.description}
          </Text>

          <Divider style={styles.divider} />

          {/* Location */}
          <View style={styles.detailRow}>
            <Icon source="map-marker-outline" size={20} color={brandColors.textMuted} />
            <View style={styles.detailContent}>
              <Text variant="labelMedium" style={styles.detailLabel}>General Area</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {task.general_location_name || 'Not specified'}
              </Text>
            </View>
          </View>

          {/* Posted date */}
          <View style={styles.detailRow}>
            <Icon source="clock-outline" size={20} color={brandColors.textMuted} />
            <View style={styles.detailContent}>
              <Text variant="labelMedium" style={styles.detailLabel}>Posted</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {new Date(task.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {/* Bid count */}
          <View style={styles.detailRow}>
            <Icon source="hand-extended-outline" size={20} color={brandColors.textMuted} />
            <View style={styles.detailContent}>
              <Text variant="labelMedium" style={styles.detailLabel}>Bids</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {bidCount} {bidCount === 1 ? 'bid' : 'bids'} submitted
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Requester */}
          {task.requester && (
            <Card
              style={styles.requesterCard}
              mode="elevated"
              onPress={() => {
                try {
                  navigation.navigate('PublicProfile', { userId: task.requester!.id });
                } catch {
                  // PublicProfile screen not yet implemented
                }
              }}
            >
              <Card.Content style={styles.requesterContent}>
                {task.requester.avatar_url ? (
                  <Avatar.Image size={48} source={{ uri: task.requester.avatar_url }} />
                ) : (
                  <Avatar.Icon size={48} icon="account" />
                )}
                <View style={styles.requesterInfo}>
                  <Text variant="titleSmall" style={styles.requesterName}>
                    {task.requester.full_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.requesterRole}>
                    Task Requester
                  </Text>
                </View>
                <Icon source="chevron-right" size={20} color={brandColors.textMuted} />
              </Card.Content>
            </Card>
          )}

          {/* Existing bid info */}
          {existingBid && (
            <Card style={styles.existingBidCard}>
              <Card.Content style={styles.existingBidContent}>
                <Icon source="check-circle-outline" size={24} color={brandColors.success} />
                <View style={styles.existingBidInfo}>
                  <Text variant="titleSmall" style={styles.existingBidTitle}>
                    Your Bid: ₪{existingBid.offered_price}
                  </Text>
                  <StatusBadge status={existingBid.status} />
                </View>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        {bottomBarState === 'submit' && (
          <Button
            mode="contained"
            onPress={handleOpenBidModal}
            style={styles.bottomButton}
            contentStyle={styles.bottomButtonContent}
            labelStyle={styles.bottomButtonLabel}
            icon="hand-extended-outline"
          >
            Submit Bid
          </Button>
        )}
        {bottomBarState === 'submitted' && (
          <Button
            mode="outlined"
            disabled
            style={styles.bottomButton}
            contentStyle={styles.bottomButtonContent}
            icon="check-circle-outline"
          >
            Bid Submitted
          </Button>
        )}
        {bottomBarState === 'closed' && (
          <Button
            mode="outlined"
            disabled
            style={styles.bottomButton}
            contentStyle={styles.bottomButtonContent}
            icon="lock-outline"
          >
            No longer accepting bids
          </Button>
        )}
      </View>

      {/* Bid Submission Modal */}
      <Portal>
        <Modal
          visible={bidModalVisible}
          onDismiss={() => !bidSubmitting && setBidModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Submit Your Bid
          </Text>
          <Text variant="bodySmall" style={styles.modalSubtitle}>
            {task.suggested_price != null
              ? `Suggested budget: ₪${task.suggested_price}`
              : 'The requester is open to quotes.'}
          </Text>

          <TextInput
            mode="outlined"
            label="Your price (₪)"
            placeholder="e.g. 250"
            value={bidPrice}
            onChangeText={(text) => {
              setBidPrice(text.replace(/[^0-9.]/g, ''));
              setBidError(null);
            }}
            keyboardType="numeric"
            left={<TextInput.Affix text="₪" />}
            style={styles.modalInput}
          />

          <TextInput
            mode="outlined"
            label="Your pitch"
            placeholder="Tell the requester why you're the right person for this job..."
            value={bidPitch}
            onChangeText={(text) => {
              setBidPitch(text);
              setBidError(null);
            }}
            multiline
            numberOfLines={Platform.OS === 'web' ? 5 : 4}
            maxLength={MAX_PITCH_LENGTH}
            style={styles.modalInput}
          />
          <Text variant="bodySmall" style={styles.charCount}>
            {bidPitch.length}/{MAX_PITCH_LENGTH}
          </Text>

          {bidError && (
            <Text variant="bodySmall" style={styles.bidErrorText}>
              {bidError}
            </Text>
          )}

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setBidModalVisible(false)}
              disabled={bidSubmitting}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmitBid}
              loading={bidSubmitting}
              disabled={bidSubmitting}
              style={styles.modalButton}
              icon="send"
            >
              Send Offer
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: brandColors.background,
  },

  carouselImage: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: brandColors.surface,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brandColors.outline,
  },
  dotActive: {
    backgroundColor: brandColors.primary,
    width: 20,
  },
  placeholderCarousel: {
    height: CAROUSEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brandColors.surfaceAlt,
    gap: 8,
  },
  placeholderText: {
    color: brandColors.textMuted,
  },

  infoSection: {
    padding: 20,
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: brandColors.infoSoft,
  },
  categoryText: {
    color: brandColors.primary,
  },
  budget: {
    color: brandColors.primary,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: brandColors.outline,
  },
  description: {
    color: brandColors.textPrimary,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    color: brandColors.textMuted,
  },
  detailValue: {
    color: brandColors.textPrimary,
  },

  requesterCard: {
    borderRadius: 22,
    backgroundColor: brandColors.surface,
  },
  requesterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requesterInfo: {
    flex: 1,
  },
  requesterName: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  requesterRole: {
    color: brandColors.textMuted,
    marginTop: 2,
  },

  existingBidCard: {
    borderRadius: 22,
    backgroundColor: brandColors.successSoft,
  },
  existingBidContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  existingBidInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  existingBidTitle: {
    color: brandColors.success,
    fontWeight: '700',
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: brandColors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brandColors.outline,
    shadowColor: '#112336',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomButton: {
    borderRadius: 999,
  },
  bottomButtonContent: {
    paddingVertical: 6,
  },
  bottomButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },

  modalContainer: {
    margin: 20,
    padding: 24,
    borderRadius: 28,
    backgroundColor: brandColors.surface,
  },
  modalTitle: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: brandColors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 8,
    backgroundColor: brandColors.surface,
  },
  charCount: {
    textAlign: 'right',
    color: brandColors.textMuted,
    marginBottom: 8,
  },
  bidErrorText: {
    color: brandColors.danger,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 999,
  },
});
