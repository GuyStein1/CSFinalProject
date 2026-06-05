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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/axiosInstance';
import { uploadImage } from '../utils/uploadImage';
import { auth } from '../config/firebase';
import StatusBadge from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { FButton, FInput } from '../components/ui';
import { brandColors, spacing, radii, shadows, typography } from '../theme';
import { getCategoryMeta, getCategoryLabel } from '../utils/categoryMetadata';

interface DirectionsResult {
  distanceText: string;   // e.g. "12.3 ק״מ"
  durationText: string;   // e.g. "18 דקות"
  durationInTraffic?: string | null; // real-time with traffic
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
  urgency?: 'FLEXIBLE' | 'THIS_WEEK' | 'TODAY';
  suggested_price: number | null;
  media_urls: string[];
  completion_photos: string[];
  general_location_name: string;
  is_payment_confirmed: boolean;
  requester_completed: boolean;
  fixer_completed: boolean;
  created_at: string;
  requester_id: string;
  assigned_fixer_id?: string | null;
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
  rejection_reason?: string | null;
  rejection_note?: string | null;
  auto_rejected_winning_price?: number | null;
  auto_rejected_winning_rating?: number | null;
}

// Rejection labels now come from i18n: taskDetailsFixer.rejectionReasons.*

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_HEIGHT = 260;
const MAX_PITCH_LENGTH = 500;

interface Props {
  route: { params?: { taskId?: string } };
}

export default function TaskDetailsFixer({ route }: Props) {
  const { t } = useTranslation();
  const taskId = route.params?.taskId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();

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
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

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

  // Fetch real driving directions via backend proxy (Google Directions API)
  useEffect(() => {
    if (!userCoords || !task?.lat || !task?.lng || !taskId) return;
    (async () => {
      try {
        const res = await api.get(`/api/tasks/${taskId}/directions`, {
          params: { originLat: userCoords.lat, originLng: userCoords.lng },
        });
        if (res.data.directions) setDirections(res.data.directions);
      } catch {
        // Directions unavailable — card simply won't show
      }
    })();
  }, [userCoords, task?.lat, task?.lng, taskId]);

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
      setError(t('taskDetailsFixer.error.loadFailed'));
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
        Alert.alert(t('common.error'), t('taskDetailsFixer.alerts.failedWithdraw'));
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(t('taskDetailsFixer.alerts.withdrawMessage'))) doWithdraw();
    } else {
      Alert.alert(t('taskDetailsFixer.alerts.withdrawTitle'), t('taskDetailsFixer.alerts.withdrawMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('taskDetailsFixer.alerts.withdrawConfirm'), style: 'destructive', onPress: doWithdraw },
      ]);
    }
  };

  const handleSubmitBid = async () => {
    const price = parseFloat(bidPrice);
    if (isNaN(price) || price <= 0) {
      setBidError(t('taskDetailsFixer.bidModal.errorPrice'));
      return;
    }
    if (!bidPitch.trim()) {
      setBidError(t('taskDetailsFixer.bidModal.errorPitch'));
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
        setBidError(t('taskDetailsFixer.bidModal.maxBids'));
      } else {
        setBidError(axiosErr.response?.data?.error?.message ?? t('taskDetailsFixer.bidModal.errorSubmit'));
      }
    } finally {
      setBidSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen label={t('taskDetailsFixer.loading')} />;
  }

  if (error || !task) {
    return (
      <View style={styles.errorContainer}>
        <EmptyState
          icon="alert-circle-outline"
          title={t('taskDetailsFixer.error.title')}
          message={error ?? t('taskDetailsFixer.notFound')}
          actionLabel={t('common.retry')}
          onAction={fetchData}
        />
      </View>
    );
  }

  const budgetLabel = task.suggested_price != null ? `₪${task.suggested_price}` : t('taskDetails.detail.quoteRequired');
  const hasPhotos = task.media_urls && task.media_urls.length > 0;
  const catMeta = getCategoryMeta(task.category);

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
            <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>{t('taskDetailsFixer.noPhotos')}</Text>
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

          {/* Category + Urgency + Budget */}
          <View style={styles.chipRow}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
              <View style={[styles.categoryChip, { backgroundColor: catMeta.bg }]}>
                <MaterialCommunityIcons name={catMeta.icon as never} size={16} color={catMeta.color} />
                <Text style={[typography.label, { color: catMeta.color }]}>{getCategoryLabel(task.category as never, t)}</Text>
              </View>
              {task.urgency === 'TODAY' && (
                <View style={[styles.categoryChip, { backgroundColor: brandColors.dangerSoft }]}>
                  <MaterialCommunityIcons name="clock-alert-outline" size={16} color={brandColors.danger} />
                  <Text style={[typography.label, { color: brandColors.danger }]}>Today</Text>
                </View>
              )}
              {task.urgency === 'THIS_WEEK' && (
                <View style={[styles.categoryChip, { backgroundColor: brandColors.warningSoft }]}>
                  <MaterialCommunityIcons name="calendar-week" size={16} color={brandColors.warning} />
                  <Text style={[typography.label, { color: brandColors.warning }]}>This week</Text>
                </View>
              )}
            </View>
            <Text style={[typography.h2, styles.budget]}>{budgetLabel}</Text>
          </View>

          <Divider style={styles.divider} />

          {/* Description */}
          <Text style={[typography.body, styles.description]}>{task.description}</Text>

          <Divider style={styles.divider} />

          {/* Detail Rows */}
          <InfoRow icon="map-marker-outline" label={t('taskDetailsFixer.detail.generalArea')} value={task.general_location_name || 'Not specified'} />
          <InfoRow
            icon="calendar-outline"
            label={t('taskDetailsFixer.detail.posted')}
            value={new Date(task.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          />
          <InfoRow
            icon="hand-extended-outline"
            label={t('taskDetails.sections.bids')}
            value={t(bidCount === 1 ? 'taskDetailsFixer.detail.bid' : 'taskDetailsFixer.detail.bids', { count: bidCount })}
          />

          {/* Distance & travel time (Google Directions API) */}
          {directions && (
            <View style={styles.distanceCard}>
              <View style={styles.distanceIconShell}>
                <MaterialCommunityIcons name="map-marker-distance" size={20} color={brandColors.primary} />
              </View>
              <View style={styles.distanceInfo}>
                <Text style={[typography.h3, { color: brandColors.textPrimary }]}>
                  {directions.distanceText}
                </Text>
                <Text style={[typography.bodySm, { color: brandColors.textMuted }]}>
                  {directions.durationInTraffic ?? directions.durationText}
                </Text>
              </View>
              <MaterialCommunityIcons name="car-outline" size={20} color={brandColors.textMuted} />
            </View>
          )}

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
                  {t('taskDetailsFixer.requester')}
                </Text>
              </View>
            </View>
          )}

          {/* Existing bid info */}
          {existingBid && (
            <View style={[
              styles.existingBidBanner,
              existingBid.status === 'REJECTED' && styles.existingBidRejected,
            ]}>
              <MaterialCommunityIcons
                name={existingBid.status === 'REJECTED' ? 'close-circle' : 'check-circle'}
                size={22}
                color={existingBid.status === 'REJECTED' ? brandColors.danger : brandColors.success}
              />
              <View style={{ flex: 1 }}>
                <Text style={[typography.h3, { color: existingBid.status === 'REJECTED' ? brandColors.danger : brandColors.success }]}>
                  {t('taskDetailsFixer.yourBid', { amount: existingBid.offered_price })}
                </Text>
                {existingBid.status === 'REJECTED' && existingBid.rejection_reason && (
                  <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
                    <Text style={[typography.bodySm, { color: brandColors.textSecondary }]}>
                      {t('taskDetailsFixer.completion.reason')}: {t(`taskDetailsFixer.rejectionReasons.${existingBid.rejection_reason}`, { defaultValue: existingBid.rejection_reason })}
                    </Text>
                    {existingBid.rejection_note ? (
                      <Text style={[typography.bodySm, { color: brandColors.textMuted, fontStyle: 'italic' }]}>
                        &quot;{existingBid.rejection_note}&quot;
                      </Text>
                    ) : null}
                    {existingBid.auto_rejected_winning_price != null && (
                      <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                        Winning bid: ₪{existingBid.auto_rejected_winning_price}
                        {existingBid.auto_rejected_winning_rating != null && existingBid.auto_rejected_winning_rating > 0
                          ? ` · Rating: ${existingBid.auto_rejected_winning_rating.toFixed(1)}★`
                          : ''}
                      </Text>
                    )}
                  </View>
                )}
              </View>
              <StatusBadge status={existingBid.status} />
            </View>
          )}

          {/* Completion Photos — only for assigned fixer on in-progress tasks */}
          {existingBid?.status === 'ACCEPTED' && task.status === 'IN_PROGRESS' && (
            <View style={{ gap: spacing.md }}>
              <Divider style={styles.divider} />
              <Text style={[typography.h3, { color: brandColors.textPrimary }]}>{t('taskDetailsFixer.completion.photos')}</Text>
              {(task.completion_photos?.length ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {task.completion_photos.map((url, i) => (
                    <Image key={i} source={{ uri: url }} style={{ width: 80, height: 80, borderRadius: radii.md }} />
                  ))}
                </View>
              )}
              <FButton
                variant="secondary"
                icon="camera-plus-outline"
                loading={uploadingPhotos}
                disabled={uploadingPhotos}
                onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: 'images',
                    quality: 0.8,
                    allowsMultipleSelection: true,
                  });
                  if (result.canceled || !task) return;
                  setUploadingPhotos(true);
                  try {
                    const userId = auth.currentUser?.uid ?? 'unknown';
                    const urls = await Promise.all(
                      result.assets.map((asset, i) =>
                        uploadImage(asset.uri, `completion/${userId}/${Date.now()}_${i}.jpg`),
                      ),
                    );
                    const allPhotos = [...(task.completion_photos ?? []), ...urls];
                    await api.post(`/api/tasks/${task.id}/completion-photos`, {
                      completion_photos: allPhotos,
                    });
                    setTask((prev) => prev ? { ...prev, completion_photos: allPhotos } : prev);
                    Alert.alert(t('taskDetailsFixer.completion.uploaded'), t('taskDetailsFixer.completion.uploadedMessage'));
                  } catch {
                    Alert.alert(t('common.error'), t('taskDetailsFixer.completion.uploadError'));
                  } finally {
                    setUploadingPhotos(false);
                  }
                }}
                fullWidth
              >
                {t('taskDetailsFixer.completion.addPhotos')}
              </FButton>
            </View>
          )}

          {/* Mark Completed — only after payment confirmed */}
          {existingBid?.status === 'ACCEPTED' && task.status === 'IN_PROGRESS' && (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Divider style={styles.divider} />
              {!task.is_payment_confirmed && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={brandColors.textMuted} />
                  <Text style={[typography.body, { color: brandColors.textMuted, flex: 1 }]}>
                    {t('taskDetailsFixer.completion.waitingPayment')}
                  </Text>
                </View>
              )}
              {task.is_payment_confirmed && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs }}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={brandColors.success} />
                  <Text style={[typography.caption, { color: brandColors.success }]}>{t('taskDetailsFixer.completion.paymentConfirmed')}</Text>
                </View>
              )}
              {task.is_payment_confirmed && !task.fixer_completed && (
                <FButton
                  variant="primary"
                  icon="check-circle-outline"
                  onPress={async () => {
                    try {
                      await api.put(`/api/tasks/${task.id}/confirm-completion`);
                      fetchData();
                    } catch {
                      Alert.alert(t('common.error'), t('taskDetails.alerts.failedComplete'));
                    }
                  }}
                  fullWidth
                >
                  {t('taskDetailsFixer.completion.markCompleted')}
                </FButton>
              )}
              {task.is_payment_confirmed && task.fixer_completed && !task.requester_completed && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={brandColors.warning} />
                  <Text style={[typography.body, { color: brandColors.textMuted, flex: 1 }]}>
                    {t('taskDetailsFixer.completion.waitingRequester')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Chat with Requester — only when bid is accepted */}
          {existingBid?.status === 'ACCEPTED' && task && (
            <FButton
              variant="outline"
              icon="chat-outline"
              onPress={() => navigation.navigate('Chat', {
                taskId: task.id,
                recipientId: task.requester_id,
                recipientName: task.requester?.full_name || 'Requester',
                recipientAvatar: task.requester?.avatar_url || null,
                taskTitle: task.title,
                taskStatus: task.status,
              })}
              fullWidth
              style={{ marginTop: spacing.sm }}
            >
              {t('taskDetailsFixer.actions.chatWithRequester')}
            </FButton>
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
            {t('taskDetailsFixer.actions.submitBid')}
          </FButton>
        )}
        {bottomBarState === 'submitted' && (
          <View style={styles.submittedActions}>
            <FButton variant="outline" icon="pencil-outline" size="lg" onPress={handleEditBid} style={{ flex: 1 }}>
              {t('taskDetailsFixer.actions.editBid')}
            </FButton>
            <FButton variant="danger" icon="close-circle-outline" size="lg" onPress={handleWithdrawBid} style={{ flex: 1 }}>
              {t('taskDetailsFixer.actions.withdraw')}
            </FButton>
          </View>
        )}
        {bottomBarState === 'closed' && (
          <FButton variant="outline" fullWidth disabled icon="lock-outline" size="lg">
            {t('taskDetailsFixer.bidStatus.noLongerAccepting')}
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
            <Text style={[typography.h2, { color: brandColors.textPrimary }]}>{isEditing ? t('taskDetailsFixer.bidModal.editTitle') : t('taskDetailsFixer.bidModal.title')}</Text>
            <Text style={[typography.bodySm, { color: brandColors.textMuted, marginTop: spacing.xs }]}>
              {task.suggested_price != null
                ? t('taskDetailsFixer.suggestedBudget', { amount: task.suggested_price })
                : t('taskDetailsFixer.openToQuotes')}
            </Text>
          </View>

          <FInput
            label={t('taskDetailsFixer.bidModal.price')}
            placeholder={t('taskDetailsFixer.bidModal.pricePlaceholder')}
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
            label={t('taskDetailsFixer.bidModal.pitchLabel')}
            placeholder={t('taskDetailsFixer.bidModal.pitchPlaceholder')}
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
              {t('common.cancel')}
            </FButton>
            <FButton
              onPress={handleSubmitBid}
              loading={bidSubmitting}
              disabled={bidSubmitting}
              style={{ flex: 1 }}
              icon={isEditing ? 'check' : 'send'}
            >
              {isEditing ? t('taskDetailsFixer.bidModal.updateOffer') : t('taskDetailsFixer.bidModal.submit')}
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
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: brandColors.successSoft,
  },
  existingBidRejected: {
    backgroundColor: brandColors.dangerSoft,
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
