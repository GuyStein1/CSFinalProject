import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  Divider,
  Portal,
  Modal,
  Text,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { FButton, FInput } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

/* ------------------------------------------------------------------ */
/*  Haversine distance (km) + rough drive-time estimate               */
/* ------------------------------------------------------------------ */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDriveMinutes(km: number): number {
  // ~40 km/h average city driving in Israel
  return Math.round((km / 40) * 60);
}

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
  lat?: number | null;
  lng?: number | null;
}

interface ExistingBid {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  offered_price: number;
  description?: string;
}

const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  ASSEMBLY:    { icon: 'hammer-screwdriver', label: 'Assembly',    color: '#7B61FF' },
  MOUNTING:    { icon: 'television',         label: 'Mounting',    color: '#0D7C6E' },
  MOVING:      { icon: 'truck-delivery',     label: 'Moving',      color: '#1E8449' },
  PAINTING:    { icon: 'brush',              label: 'Painting',    color: '#C0392B' },
  PLUMBING:    { icon: 'water-pump',         label: 'Plumbing',    color: '#2E86C1' },
  ELECTRICITY: { icon: 'lightning-bolt',     label: 'Electricity', color: '#D4900A' },
  OUTDOORS:    { icon: 'tree-outline',       label: 'Outdoors',    color: '#27AE60' },
  CLEANING:    { icon: 'broom',             label: 'Cleaning',    color: '#8E44AD' },
};
const DEFAULT_CAT_META = { icon: 'wrench', label: 'Other', color: '#7A8B96' };

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_HEIGHT = 260;
const MAX_PITCH_LENGTH = 500;

interface Props {
  route: { params?: { taskId?: string } };
}

export default function TaskDetailsFixer({ route }: Props) {
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
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's location for distance calculation
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 8000,
              maximumAge: 120_000,
            });
          });
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        }
      } catch {
        // Location unavailable — distance card simply won't show
      }
    })();
  }, []);

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

  const [isEditing, setIsEditing] = useState(false);

  const handleOpenBidModal = () => {
    setBidPrice('');
    setBidPitch('');
    setBidError(null);
    setIsEditing(false);
    setBidModalVisible(true);
  };

  const handleEditBid = () => {
    if (!existingBid) return;
    setBidPrice(String(existingBid.offered_price));
    setBidPitch(existingBid.description ?? '');
    setBidError(null);
    setIsEditing(true);
    setBidModalVisible(true);
  };

  const handleWithdrawBid = () => {
    if (!existingBid) return;
    const doWithdraw = async () => {
      try {
        await api.put(`/api/bids/${existingBid.id}/withdraw`);
        setExistingBid({ ...existingBid, status: 'WITHDRAWN' });
      } catch {
        Alert.alert('Error', 'Failed to withdraw bid. Please try again.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to withdraw your bid?')) doWithdraw();
    } else {
      Alert.alert('Withdraw Bid', 'Are you sure you want to withdraw your bid?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Withdraw', style: 'destructive', onPress: doWithdraw },
      ]);
    }
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
      if (isEditing && existingBid) {
        const res = await api.put(`/api/bids/${existingBid.id}`, {
          offered_price: price,
          description: bidPitch.trim(),
        });
        const bid = res.data.bid;
        setExistingBid({ id: bid.id, status: bid.status, offered_price: bid.offered_price, description: bid.description });
      } else {
        const res = await api.post(`/api/tasks/${taskId}/bids`, {
          offered_price: price,
          description: bidPitch.trim(),
        });
        const bid = res.data.bid;
        setExistingBid({ id: bid.id, status: bid.status, offered_price: bid.offered_price, description: bid.description });
      }
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
  const catMeta = CATEGORY_META[task.category] ?? DEFAULT_CAT_META;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <LinearGradient
              colors={[brandColors.surfaceAlt, brandColors.background]}
              style={StyleSheet.absoluteFill}
            />
            <MaterialCommunityIcons name="image-off-outline" size={44} color={brandColors.textMuted} />
            <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>No photos attached</Text>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Title + Status */}
          <View style={styles.titleRow}>
            <Text style={[typography.h1, styles.title]} numberOfLines={3}>
              {task.title}
            </Text>
            <StatusBadge status={task.status} />
          </View>

          {/* Category + Budget */}
          <View style={styles.chipRow}>
            <View style={[styles.categoryChip, { backgroundColor: catMeta.color + '18' }]}>
              <MaterialCommunityIcons name={catMeta.icon as never} size={16} color={catMeta.color} />
              <Text style={[typography.label, { color: catMeta.color }]}>{catMeta.label}</Text>
            </View>
            <Text style={[typography.h2, styles.budget]}>{budgetLabel}</Text>
          </View>

          <Divider style={styles.divider} />

          {/* Description */}
          <Text style={[typography.body, styles.description]}>{task.description}</Text>

          <Divider style={styles.divider} />

          {/* Detail Rows */}
          <InfoRow icon="map-marker-outline" label="General Area" value={task.general_location_name || 'Not specified'} />
          <InfoRow
            icon="calendar-outline"
            label="Posted"
            value={new Date(task.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          />
          <InfoRow
            icon="hand-extended-outline"
            label="Bids"
            value={`${bidCount} ${bidCount === 1 ? 'bid' : 'bids'} submitted`}
          />

          {/* Distance & travel time */}
          {userCoords && task.lat != null && task.lng != null && (() => {
            const km = haversineKm(userCoords.lat, userCoords.lng, task.lat, task.lng);
            const mins = estimateDriveMinutes(km);
            return (
              <View style={styles.distanceCard}>
                <View style={styles.distanceIconShell}>
                  <MaterialCommunityIcons name="map-marker-distance" size={20} color={brandColors.primary} />
                </View>
                <View style={styles.distanceInfo}>
                  <Text style={[typography.h3, { color: brandColors.textPrimary }]}>
                    {km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)} km`} away
                  </Text>
                  <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
                    ~{mins < 1 ? '1' : mins} min drive
                  </Text>
                </View>
                <MaterialCommunityIcons name="car-outline" size={20} color={brandColors.textMuted} />
              </View>
            );
          })()}

          <Divider style={styles.divider} />

          {/* Requester */}
          {task.requester && (
            <View
              style={styles.requesterRow}
            >
              {task.requester.avatar_url ? (
                <Avatar.Image size={48} source={{ uri: task.requester.avatar_url }} />
              ) : (
                <Avatar.Icon size={48} icon="account" style={{ backgroundColor: brandColors.primaryMuted }} />
              )}
              <View style={styles.requesterInfo}>
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>
                  {task.requester.full_name}
                </Text>
                <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                  Task Requester
                </Text>
              </View>
            </View>
          )}

          {/* Existing bid info */}
          {existingBid && (
            <View style={styles.existingBidBanner}>
              <MaterialCommunityIcons name="check-circle" size={22} color={brandColors.success} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.h3, { color: brandColors.success }]}>
                  Your Bid: ₪{existingBid.offered_price}
                </Text>
              </View>
              <StatusBadge status={existingBid.status} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.bottomBar}>
        {bottomBarState === 'submit' && (
          <FButton
            onPress={handleOpenBidModal}
            fullWidth
            icon="hand-extended-outline"
            size="lg"
          >
            Submit Bid
          </FButton>
        )}
        {bottomBarState === 'submitted' && (
          <View style={styles.submittedActions}>
            <FButton variant="outline" icon="pencil-outline" size="lg" onPress={handleEditBid} style={{ flex: 1 }}>
              Edit Bid
            </FButton>
            <FButton variant="danger" icon="close-circle-outline" size="lg" onPress={handleWithdrawBid} style={{ flex: 1 }}>
              Withdraw
            </FButton>
          </View>
        )}
        {bottomBarState === 'closed' && (
          <FButton variant="outline" fullWidth disabled icon="lock-outline" size="lg">
            No longer accepting bids
          </FButton>
        )}
      </View>

      {/* Bid Submission Modal */}
      <Portal>
        <Modal
          visible={bidModalVisible}
          onDismiss={() => !bidSubmitting && setBidModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="hand-extended-outline" size={24} color={brandColors.primary} />
            </View>
            <Text style={[typography.h2, { color: brandColors.textPrimary }]}>{isEditing ? 'Edit Your Bid' : 'Submit Your Bid'}</Text>
            <Text style={[typography.bodySm, { color: brandColors.textMuted, marginTop: spacing.xs }]}>
              {task.suggested_price != null
                ? `Suggested budget: ₪${task.suggested_price}`
                : 'The requester is open to quotes.'}
            </Text>
          </View>

          <FInput
            label="Your price (₪)"
            placeholder="e.g. 250"
            value={bidPrice}
            onChangeText={(text: string) => {
              setBidPrice(text.replace(/[^0-9.]/g, ''));
              setBidError(null);
            }}
            keyboardType="numeric"
            left={<FInput.Affix text="₪" />}
          />

          <View style={{ height: spacing.md }} />

          <FInput
            label="Your pitch"
            placeholder="Tell the requester why you're the right person..."
            value={bidPitch}
            onChangeText={(text: string) => {
              setBidPitch(text);
              setBidError(null);
            }}
            multiline
            numberOfLines={Platform.OS === 'web' ? 5 : 4}
            maxLength={MAX_PITCH_LENGTH}
          />
          <Text style={[typography.caption, { textAlign: 'right', color: brandColors.textMuted, marginTop: spacing.xs }]}>
            {bidPitch.length}/{MAX_PITCH_LENGTH}
          </Text>

          {bidError && (
            <Text style={[typography.bodySm, { color: brandColors.danger, marginTop: spacing.sm }]}>
              {bidError}
            </Text>
          )}

          <View style={styles.modalActions}>
            <FButton
              variant="outline"
              onPress={() => setBidModalVisible(false)}
              disabled={bidSubmitting}
              style={{ flex: 1 }}
            >
              Cancel
            </FButton>
            <FButton
              onPress={handleSubmitBid}
              loading={bidSubmitting}
              disabled={bidSubmitting}
              style={{ flex: 1 }}
              icon={isEditing ? 'check' : 'send'}
            >
              {isEditing ? 'Update Offer' : 'Send Offer'}
            </FButton>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconShell}>
        <MaterialCommunityIcons name={icon as never} size={18} color={brandColors.primaryMuted} />
      </View>
      <View style={styles.infoText}>
        <Text style={[typography.caption, { color: brandColors.textMuted }]}>{label}</Text>
        <Text style={[typography.body, { color: brandColors.textPrimary }]}>{value}</Text>
      </View>
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
    gap: spacing.xs + 2,
    paddingVertical: spacing.md,
    backgroundColor: brandColors.surface,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brandColors.outlineLight,
  },
  dotActive: {
    backgroundColor: brandColors.primary,
    width: 22,
    borderRadius: 4,
  },
  placeholderCarousel: {
    height: CAROUSEL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  infoSection: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    color: brandColors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  budget: {
    color: brandColors.primary,
  },
  divider: {
    backgroundColor: brandColors.outlineLight,
  },
  description: {
    color: brandColors.textSecondary,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoIconShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    gap: 2,
  },

  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.surface,
    ...shadows.sm,
  },
  requesterInfo: {
    flex: 1,
    gap: 2,
  },

  distanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.infoSoft,
  },
  distanceIconShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: brandColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceInfo: {
    flex: 1,
    gap: 2,
  },

  existingBidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.successSoft,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    backgroundColor: brandColors.surface,
    ...shadows.lg,
  },

  modalContainer: {
    margin: spacing.xl,
    padding: spacing.xxl,
    borderRadius: radii.xxxl,
    backgroundColor: brandColors.surface,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brandColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  submittedActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
