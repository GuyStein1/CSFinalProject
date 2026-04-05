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
import { Button, Card, Chip, Icon, IconButton, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import useBids, { type BidStatus, type UserBid } from '../hooks/useBids';
import { brandColors } from '../theme';

type TabFilter = 'ALL' | BidStatus | 'COMPLETED';

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

const CATEGORY_ICONS: Record<string, string> = {
  ELECTRICITY: 'lightning-bolt',
  PLUMBING: 'water',
  CARPENTRY: 'hammer',
  PAINTING: 'format-paint',
  MOVING: 'truck',
  GENERAL: 'wrench',
};

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
  _onDelete: (bidId: string) => void;
  _onMarkCompleted: (bid: UserBid) => void;
  onCancelAccepted: (bid: UserBid) => void;
}

function BidCard({ bid, onPress, onWithdraw, onReactivate, onEdit, _onDelete, _onMarkCompleted, onCancelAccepted }: BidCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isPending = bid.status === 'PENDING';

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
          Animated.spring(translateX, {
            toValue: -WITHDRAW_BUTTON_WIDTH,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const categoryIcon = CATEGORY_ICONS[bid.task.category] ?? 'wrench';
  const budgetLabel =
    bid.task.suggested_price != null ? `₪${bid.task.suggested_price}` : 'Quote';

  return (
    <View style={styles.swipeContainer}>
      {isPending && (
        <Pressable
          style={styles.withdrawAction}
          onPress={() => {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
            onWithdraw(bid.id);
          }}
        >
          <Icon source="close-circle-outline" size={22} color="#FFF" />
          <Text variant="labelSmall" style={styles.withdrawText}>
            Withdraw
          </Text>
        </Pressable>
      )}

      <Animated.View
        style={[styles.cardAnimated, { transform: [{ translateX }] }]}
        {...(isPending ? panResponder.panHandlers : {})}
      >
        <Card style={styles.bidCard} onPress={onPress} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <View style={styles.topRow}>
              <View style={styles.iconShell}>
                <Icon source={categoryIcon} size={20} color={brandColors.primary} />
              </View>
              <View style={styles.titleBlock}>
                <Text variant="titleSmall" style={styles.taskTitle} numberOfLines={1}>
                  {bid.task.title}
                </Text>
                <Text variant="bodySmall" style={styles.taskLocation} numberOfLines={1}>
                  {bid.task.general_location_name || 'Location not set'} · {budgetLabel}
                </Text>
              </View>
              <StatusBadge status={bid.status} />
            </View>

            <View style={styles.bidDetails}>
              <View style={styles.priceRow}>
                <Text variant="labelMedium" style={styles.priceLabel}>Your offer</Text>
                <Text variant="titleSmall" style={styles.priceValue}>₪{bid.offered_price}</Text>
              </View>
              <Text variant="bodySmall" style={styles.pitch} numberOfLines={1}>
                {bid.description}
              </Text>
            </View>

            <View style={styles.bottomRow}>
              <Text variant="bodySmall" style={styles.dateText}>
                Submitted {formatDate(bid.created_at)}
              </Text>
              <View style={styles.actionButtons}>
                {isPending && Platform.OS === 'web' && (
                  <>
                    <Button
                      mode="outlined"
                      compact
                      icon="pencil"
                      onPress={() => onEdit(bid)}
                      style={styles.actionBtn}
                    >
                      Edit
                    </Button>
                    <Button
                      mode="outlined"
                      textColor={brandColors.danger}
                      compact
                      onPress={() => onWithdraw(bid.id)}
                      style={[styles.actionBtn, { borderColor: brandColors.danger }]}
                    >
                      Withdraw
                    </Button>
                  </>
                )}
                {bid.status === 'ACCEPTED' && bid.task.status !== 'COMPLETED' && (
                  <Button
                    mode="outlined"
                    textColor={brandColors.danger}
                    compact
                    onPress={() => onCancelAccepted(bid)}
                    style={[styles.actionBtn, { borderColor: brandColors.danger }]}
                  >
                    Cancel
                  </Button>
                )}
                {bid.status === 'WITHDRAWN' && (
                  <Button
                    mode="outlined"
                    textColor={brandColors.success}
                    compact
                    onPress={() => onReactivate(bid.id)}
                    style={[styles.actionBtn, { borderColor: brandColors.success }]}
                  >
                    Reactivate
                  </Button>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>
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

  const [editingBid, setEditingBid] = useState<UserBid | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const handleWithdraw = useCallback(
    async (bidId: string) => {
      if (Platform.OS === 'web') {
        if (!window.confirm('Are you sure you want to withdraw this bid?')) return;
      }
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
        const wantEdit = window.confirm('Would you like to edit your bid before reactivating?\n\nOK = Edit first\nCancel = Reactivate as-is');
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
      if (Platform.OS === 'web') {
        if (!window.confirm('Delete this bid permanently?')) return;
      }
      removeBidLocally(bidId);
      try {
        await api.delete(`/api/bids/${bidId}`);
      } catch {
        refetch();
      }
    },
    [removeBidLocally, refetch],
  );

  const handleMarkCompleted = useCallback(
    async (bid: UserBid) => {
      if (Platform.OS === 'web') {
        if (!window.confirm('Mark this task as completed?')) return;
      }
      try {
        await api.put(`/api/tasks/${bid.task_id}/status`, { status: 'COMPLETED' });
        refetch();
      } catch {
        // ignore
      }
    },
    [refetch],
  );

  const handleCancelAccepted = useCallback(
    async (bid: UserBid) => {
      if (Platform.OS === 'web') {
        if (!window.confirm('Cancel this job? The task will be reopened for other fixers.')) return;
      }
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

  const emptyMessage =
    activeTab === 'ALL'
      ? undefined
      : `No ${activeTab.toLowerCase()} bids.`;

  const emptyTitle =
    activeTab === 'ALL'
      ? "You haven't submitted any bids yet"
      : `No ${activeTab.toLowerCase()} bids`;

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
            <Chip
              selected={activeTab === item.value}
              onPress={() => setActiveTab(item.value)}
              showSelectedCheck={false}
              compact
              style={styles.tabChip}
            >
              {item.label}
            </Chip>
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
            <Card style={styles.summaryCard}>
              <Card.Content style={styles.summaryContent}>
                <View style={styles.summaryItem}>
                  <Text variant="headlineMedium" style={styles.summaryNumber}>{completedTotal}</Text>
                  <Text variant="bodySmall" style={styles.summaryLabel}>Jobs Completed</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text variant="headlineMedium" style={styles.summaryNumber}>₪{completedEarnings.toLocaleString()}</Text>
                  <Text variant="bodySmall" style={styles.summaryLabel}>Total Earned</Text>
                </View>
              </Card.Content>
            </Card>
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
                  _onDelete={handleDelete}
                  _onMarkCompleted={handleMarkCompleted}
                  onCancelAccepted={handleCancelAccepted}
                />
              </View>
              {(item.status === 'REJECTED' || item.status === 'WITHDRAWN') && (
                <IconButton
                  icon="delete-outline"
                  iconColor={brandColors.danger}
                  size={22}
                  onPress={() => handleDelete(item.id)}
                  style={styles.trashIcon}
                />
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={loading}
        />
      )}

      <Portal>
        <Modal
          visible={editingBid !== null}
          onDismiss={() => setEditingBid(null)}
          contentContainerStyle={styles.editModal}
        >
          <Text variant="titleLarge" style={styles.editModalTitle}>Edit Bid</Text>
          <TextInput
            label="Price (₪)"
            value={editPrice}
            onChangeText={setEditPrice}
            keyboardType="numeric"
            mode="outlined"
            style={styles.editInput}
          />
          <TextInput
            label="Description"
            value={editDescription}
            onChangeText={setEditDescription}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.editInput}
          />
          <Button
            mode="contained"
            onPress={handleEditSave}
            loading={editSaving}
            disabled={editSaving || !editPrice || parseFloat(editPrice) <= 0}
            style={styles.editSaveButton}
          >
            Save Changes
          </Button>
          <Button mode="text" onPress={() => setEditingBid(null)}>
            Cancel
          </Button>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outline,
  },
  tabContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabChip: {
    backgroundColor: brandColors.surfaceAlt,
  },
  listContent: {
    paddingVertical: 12,
  },

  swipeContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    borderRadius: 22,
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
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    gap: 4,
  },
  withdrawText: {
    color: '#FFF',
    fontWeight: '700',
  },
  cardAnimated: {
    backgroundColor: brandColors.surface,
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#112336',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
      web: {
        shadowColor: '#112336',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
    }),
  },
  bidCard: {
    borderRadius: 22,
    backgroundColor: brandColors.surface,
    elevation: 0,
    shadowOpacity: 0,
  },
  cardContent: {
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brandColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  taskTitle: {
    color: brandColors.textPrimary,
    fontWeight: '700',
  },
  taskLocation: {
    color: brandColors.textMuted,
    marginTop: 1,
  },
  bidDetails: {
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLabel: {
    color: brandColors.textMuted,
  },
  priceValue: {
    color: brandColors.primary,
    fontWeight: '700',
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
  dateText: {
    color: brandColors.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderRadius: 12,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 22,
    backgroundColor: brandColors.surface,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    color: brandColors.primary,
    fontWeight: '800',
  },
  summaryLabel: {
    color: brandColors.textMuted,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: brandColors.outline,
  },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidCardWrap: {
    flex: 1,
  },
  trashIcon: {
    margin: 0,
    marginRight: 8,
  },
  editModal: {
    backgroundColor: brandColors.surface,
    margin: 20,
    padding: 24,
    borderRadius: 24,
  },
  editModalTitle: {
    marginBottom: 16,
    color: brandColors.textPrimary,
  },
  editInput: {
    marginBottom: 12,
    backgroundColor: brandColors.surface,
  },
  editSaveButton: {
    marginBottom: 8,
    borderRadius: 999,
  },
});
