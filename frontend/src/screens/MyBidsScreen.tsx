import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Portal, Modal, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import { FButton, FCard, FChip, FInput } from '../components/ui';
import useBids, { type BidStatus, type UserBid } from '../hooks/useBids';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

type TabFilter = 'ALL' | BidStatus | 'COMPLETED';

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string }> = {
  ASSEMBLY:    { icon: 'hammer-screwdriver', color: '#7B61FF', bg: '#EFECFF' },
  MOUNTING:    { icon: 'television',         color: '#0D7C6E', bg: '#E0F5F3' },
  MOVING:      { icon: 'truck-delivery',     color: '#1E8449', bg: '#E6F4EC' },
  PAINTING:    { icon: 'brush',              color: '#C0392B', bg: '#FCECEA' },
  PLUMBING:    { icon: 'water-pump',         color: '#2E86C1', bg: '#E4F2FB' },
  ELECTRICITY: { icon: 'lightning-bolt',     color: '#D4900A', bg: '#FEF3D7' },
  OUTDOORS:    { icon: 'tree-outline',       color: '#27AE60', bg: '#E8F8EF' },
  CLEANING:    { icon: 'broom',             color: '#8E44AD', bg: '#F4ECF7' },
};
const DEFAULT_CAT_META = { icon: 'wrench', color: '#7A8B96', bg: brandColors.surfaceAlt };

const SWIPE_THRESHOLD = -80;
const WITHDRAW_BUTTON_WIDTH = 90;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface BidCardProps {
  bid: UserBid;
  onPress: () => void;
  onWithdraw: (bidId: string) => void;
  onReactivate: (bidId: string) => void;
  onEdit: (bid: UserBid) => void;
  onCancelAccepted: (bid: UserBid) => void;
}

function BidCard({ bid, onPress, onWithdraw, onReactivate, onEdit, onCancelAccepted }: BidCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isPending = bid.status === 'PENDING';
  const catMeta = CATEGORY_META[bid.task.category] ?? DEFAULT_CAT_META;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        isPending && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          translateX.setValue(Math.max(gesture.dx, -WITHDRAW_BUTTON_WIDTH));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, { toValue: -WITHDRAW_BUTTON_WIDTH, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const budgetLabel = bid.task.suggested_price != null ? `₪${bid.task.suggested_price}` : 'Quote';

  return (
    <View style={styles.swipeContainer}>
      {isPending && (
        <Pressable
          style={styles.withdrawAction}
          onPress={() => {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            onWithdraw(bid.id);
          }}
        >
          <MaterialCommunityIcons name="close-circle-outline" size={22} color={brandColors.white} />
          <Text style={[typography.caption, { color: brandColors.white, fontWeight: '700' }]}>
            Withdraw
          </Text>
        </Pressable>
      )}

      <Animated.View
        style={[styles.cardAnimated, { transform: [{ translateX }] }]}
        {...(isPending ? panResponder.panHandlers : {})}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.bidCard,
            { opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View style={styles.topRow}>
            <View style={[styles.iconCircle, { backgroundColor: catMeta.bg }]}>
              <MaterialCommunityIcons name={catMeta.icon as never} size={18} color={catMeta.color} />
            </View>
            <View style={styles.titleBlock}>
              <Text style={[typography.h3, { color: brandColors.textPrimary }]} numberOfLines={1}>
                {bid.task.title}
              </Text>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={12} color={brandColors.textMuted} />
                <Text style={[typography.caption, { color: brandColors.textMuted }]} numberOfLines={1}>
                  {bid.task.general_location_name || 'Location not set'} · {budgetLabel}
                </Text>
              </View>
            </View>
            <StatusBadge status={bid.status} />
          </View>

          <View style={styles.bidDetails}>
            <View style={styles.priceRow}>
              <Text style={[typography.caption, { color: brandColors.textMuted }]}>Your offer</Text>
              <View style={styles.priceTag}>
                <Text style={[typography.h3, { color: brandColors.primary }]}>₪{bid.offered_price}</Text>
              </View>
            </View>
            <Text style={[typography.bodySm, styles.pitch]} numberOfLines={1}>
              {bid.description}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.dateRow}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={brandColors.textMuted} />
              <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                Submitted {formatDate(bid.created_at)}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              {isPending && Platform.OS === 'web' && (
                <>
                  <Pressable style={[styles.actionBtn, styles.defaultActionBtn]} onPress={(e) => { e.stopPropagation(); onEdit(bid); }}>
                    <MaterialCommunityIcons name="pencil" size={13} color={brandColors.primaryMuted} />
                    <Text style={[typography.caption, { color: brandColors.primaryMuted, fontWeight: '600' }]}>Edit</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, styles.dangerActionBtn]} onPress={(e) => { e.stopPropagation(); onWithdraw(bid.id); }}>
                    <Text style={[typography.caption, { color: brandColors.danger, fontWeight: '600' }]}>Withdraw</Text>
                  </Pressable>
                </>
              )}
              {bid.status === 'ACCEPTED' && bid.task.status !== 'COMPLETED' && (
                <Pressable style={[styles.actionBtn, styles.dangerActionBtn]} onPress={(e) => { e.stopPropagation(); onCancelAccepted(bid); }}>
                  <Text style={[typography.caption, { color: brandColors.danger, fontWeight: '600' }]}>Cancel</Text>
                </Pressable>
              )}
              {bid.status === 'WITHDRAWN' && (
                <Pressable style={[styles.actionBtn, styles.successActionBtn]} onPress={(e) => { e.stopPropagation(); onReactivate(bid.id); }}>
                  <Text style={[typography.caption, { color: brandColors.success, fontWeight: '600' }]}>Reactivate</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function MyBidsScreen() {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const statusFilter = activeTab === 'COMPLETED' ? 'ACCEPTED' : activeTab === 'ALL' ? null : activeTab;

  const { bids: rawBids, loading, error, refetch, updateBidLocally, removeBidLocally } = useBids({
    status: statusFilter as BidStatus | null,
  });

  // Accepted tab: only accepted bids where task is still in progress
  // Completed tab: only accepted bids where task is completed
  const bids = rawBids.filter((b) => {
    if (activeTab === 'ACCEPTED') return b.status === 'ACCEPTED' && b.task.status !== 'COMPLETED';
    if (activeTab === 'COMPLETED') return b.status === 'ACCEPTED' && b.task.status === 'COMPLETED';
    return true;
  });

  // Summary for Completed tab
  const completedTotal = activeTab === 'COMPLETED' ? bids.length : 0;
  const completedEarnings = activeTab === 'COMPLETED'
    ? bids.reduce((sum, b) => sum + b.offered_price, 0)
    : 0;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Edit bid modal state
  const [editingBid, setEditingBid] = useState<UserBid | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const webConfirm = (msg: string): boolean => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      return confirm(msg);
    }
    return true;
  };

  const handleWithdraw = useCallback(
    async (bidId: string) => {
      if (Platform.OS === 'web' && !webConfirm('Are you sure you want to withdraw this bid?')) return;
      updateBidLocally(bidId, 'WITHDRAWN');
      try {
        await api.put(`/api/bids/${bidId}/withdraw`);
      } catch {
        refetch();
      }
    },
    [updateBidLocally, refetch],
  );

  const handleEdit = useCallback((bid: UserBid) => {
    setEditingBid(bid);
    setEditPrice(String(bid.offered_price));
    setEditDescription(bid.description);
  }, []);

  const handleReactivate = useCallback(
    async (bidId: string) => {
      if (Platform.OS === 'web') {
        const wantEdit = webConfirm('Would you like to edit your bid before reactivating?\n\nOK = Edit first\nCancel = Reactivate as-is');
        if (wantEdit) {
          updateBidLocally(bidId, 'PENDING');
          try {
            await api.put(`/api/bids/${bidId}/reactivate`);
            const reactivatedBid = bids.find((b) => b.id === bidId);
            if (reactivatedBid) {
              handleEdit({ ...reactivatedBid, status: 'PENDING' });
            }
          } catch {
            refetch();
          }
          return;
        }
      }
      updateBidLocally(bidId, 'PENDING');
      try {
        await api.put(`/api/bids/${bidId}/reactivate`);
      } catch {
        refetch();
      }
    },
    [updateBidLocally, refetch, bids, handleEdit],
  );

  const handleDelete = useCallback(
    async (bidId: string) => {
      if (Platform.OS === 'web' && !webConfirm('Delete this bid permanently?')) return;
      removeBidLocally(bidId);
      try {
        await api.delete(`/api/bids/${bidId}`);
      } catch {
        refetch();
      }
    },
    [removeBidLocally, refetch],
  );

  const handleCancelAccepted = useCallback(
    async (bid: UserBid) => {
      if (Platform.OS === 'web' && !webConfirm('Cancel this job? The task will be reopened for other fixers.')) return;
      try {
        await api.put(`/api/bids/${bid.id}/cancel-accepted`);
        refetch();
      } catch {
        // ignore
      }
    },
    [refetch],
  );

  const handleEditSave = useCallback(async () => {
    if (!editingBid) return;
    setEditSaving(true);
    try {
      await api.put(`/api/bids/${editingBid.id}`, {
        offered_price: parseFloat(editPrice),
        description: editDescription.trim(),
      });
      setEditingBid(null);
      refetch();
    } catch {
      // ignore
    } finally {
      setEditSaving(false);
    }
  }, [editingBid, editPrice, editDescription, refetch]);

  const handleBidPress = useCallback(
    (taskId: string) => {
      (navigation as { navigate: (screen: string, params: Record<string, unknown>) => void })
        .navigate('TaskDetailsFixer', { taskId });
    },
    [navigation],
  );

  const handleFindJobs = useCallback(() => {
    (navigation as { navigate: (screen: string) => void }).navigate('FindJobs');
  }, [navigation]);

  const emptyMessage = activeTab === 'ALL' ? undefined : `No ${activeTab.toLowerCase()} bids.`;
  const emptyTitle = activeTab === 'ALL' ? "You haven't submitted any bids yet" : `No ${activeTab.toLowerCase()} bids`;

  return (
    <View style={styles.container}>
      {/* Tab filter */}
      <View style={styles.tabBar}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.tabContent}
          renderItem={({ item }) => (
            <FChip
              label={item.label}
              selected={activeTab === item.value}
              onPress={() => setActiveTab(item.value)}
              compact
            />
          )}
        />
      </View>

      {/* Content */}
      {loading ? (
        <LoadingScreen label="Loading your bids..." />
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load bids"
          message={error}
          actionLabel="Try Again"
          onAction={refetch}
        />
      ) : bids.length === 0 ? (
        <EmptyState
          icon={activeTab === 'ALL' ? 'hand-extended-outline' : 'filter-off-outline'}
          title={emptyTitle}
          message={
            activeTab === 'ALL'
              ? 'Find tasks in the Discovery Feed!'
              : emptyMessage
          }
          actionLabel={activeTab === 'ALL' ? 'Find Jobs' : undefined}
          onAction={activeTab === 'ALL' ? handleFindJobs : undefined}
        />
      ) : (
        <FlatList
          data={bids}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={activeTab === 'COMPLETED' && bids.length > 0 ? (
            <FCard style={styles.summaryCard}>
              <View style={styles.summaryContent}>
                <View style={styles.summaryItem}>
                  <Text style={[typography.h1, { color: brandColors.primary }]}>{completedTotal}</Text>
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>Jobs Completed</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={[typography.h1, { color: brandColors.primary }]}>₪{completedEarnings.toLocaleString()}</Text>
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>Total Earned</Text>
                </View>
              </View>
            </FCard>
          ) : null}
          renderItem={({ item }) => (
            <View style={styles.bidRow}>
              <View style={styles.bidCardWrap}>
                <BidCard
                  bid={item}
                  onPress={() => handleBidPress(item.task_id)}
                  onWithdraw={handleWithdraw}
                  onReactivate={handleReactivate}
                  onEdit={handleEdit}
                  onCancelAccepted={handleCancelAccepted}
                />
              </View>
              {(item.status === 'REJECTED' || item.status === 'WITHDRAWN') && (
                <Pressable
                  style={styles.trashBtn}
                  hitSlop={8}
                  onPress={() => handleDelete(item.id)}
                >
                  <MaterialCommunityIcons name="delete-outline" size={22} color={brandColors.danger} />
                </Pressable>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={loading}
        />
      )}

      {/* Edit Bid Modal */}
      <Portal>
        <Modal
          visible={editingBid !== null}
          onDismiss={() => setEditingBid(null)}
          contentContainerStyle={styles.editModal}
        >
          <Text style={[typography.h2, { color: brandColors.textPrimary, marginBottom: spacing.lg }]}>
            Edit Bid
          </Text>
          <FInput
            label="Price (₪)"
            value={editPrice}
            onChangeText={setEditPrice}
            keyboardType="numeric"
          />
          <FInput
            label="Description"
            value={editDescription}
            onChangeText={setEditDescription}
            multiline
            numberOfLines={3}
          />
          <FButton
            onPress={handleEditSave}
            loading={editSaving}
            disabled={editSaving || !editPrice || parseFloat(editPrice) <= 0}
            fullWidth
            style={{ marginTop: spacing.sm }}
          >
            Save Changes
          </FButton>
          <FButton variant="outline" onPress={() => setEditingBid(null)} fullWidth style={{ marginTop: spacing.sm }}>
            Cancel
          </FButton>
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
  tabBar: {
    backgroundColor: brandColors.surface,
    ...shadows.sm,
  },
  tabContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  listContent: {
    paddingVertical: spacing.md,
  },

  swipeContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm + 2,
    overflow: 'hidden',
    borderRadius: radii.lg,
  },
  withdrawAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: WITHDRAW_BUTTON_WIDTH,
    backgroundColor: brandColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    gap: spacing.xs,
  },
  cardAnimated: {
    backgroundColor: brandColors.surface,
    borderRadius: radii.lg,
    ...shadows.sm,
  },
  bidCard: {
    borderRadius: radii.lg,
    backgroundColor: brandColors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bidDetails: {
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: brandColors.infoSoft,
  },
  pitch: {
    color: brandColors.textMuted,
    fontStyle: 'italic',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  defaultActionBtn: {
    borderColor: brandColors.outline,
  },
  dangerActionBtn: {
    borderColor: brandColors.danger,
  },
  successActionBtn: {
    borderColor: brandColors.success,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: brandColors.outlineLight,
  },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidCardWrap: {
    flex: 1,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  editModal: {
    backgroundColor: brandColors.surface,
    margin: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.xl,
    maxWidth: 500,
    alignSelf: 'center',
    width: '90%',
    gap: spacing.md,
  },
});
