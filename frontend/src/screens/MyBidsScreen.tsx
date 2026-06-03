import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Portal, Modal, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import { FButton, FCard, FChip, FInput } from '../components/ui';
import useBids, { type BidStatus, type UserBid } from '../hooks/useBids';
import { brandColors, spacing, radii, shadows, typography } from '../theme';
import { getCategoryMeta } from '../utils/categoryMetadata';

type TabFilter = 'ALL' | BidStatus | 'COMPLETED';

const TABS: { value: TabFilter; key: string }[] = [
  { value: 'ALL', key: 'active' },
  { value: 'PENDING', key: 'pending' },
  { value: 'ACCEPTED', key: 'accepted' },
  { value: 'COMPLETED', key: 'completed' },
  { value: 'REJECTED', key: 'rejected' },
  { value: 'WITHDRAWN', key: 'withdrawn' },
];

const SWIPE_THRESHOLD = -80;
const WITHDRAW_BUTTON_WIDTH = 90;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getBidAccentColor(bid: UserBid): string {
  if (bid.status === 'ACCEPTED' && bid.task.status === 'COMPLETED') return brandColors.success;
  if (bid.status === 'ACCEPTED') return brandColors.secondaryDark;
  if (bid.status === 'PENDING') return brandColors.primary;
  if (bid.status === 'WITHDRAWN') return brandColors.textMuted;
  return brandColors.danger;
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
  const { t } = useTranslation();
  const translateX = useRef(new Animated.Value(0)).current;
  const isPending = bid.status === 'PENDING';
  const catMeta = getCategoryMeta(bid.task.category);

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

  const budgetLabel = bid.task.suggested_price != null ? `₪${bid.task.suggested_price}` : t('myBids.card.quote');

  return (
    <View style={styles.swipeContainer}>
      {isPending && (
        <Pressable
          style={styles.withdrawAction}
          accessibilityRole="button"
          accessibilityLabel={`Withdraw bid for ${bid.task.title}`}
          onPress={() => {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            onWithdraw(bid.id);
          }}
        >
          <MaterialCommunityIcons name="close-circle-outline" size={22} color={brandColors.white} />
          <Text style={[typography.caption, { color: brandColors.white, fontWeight: '700' }]}>
            {t('myBids.card.withdraw')}
          </Text>
        </Pressable>
      )}

      <Animated.View
        style={[styles.cardAnimated, { transform: [{ translateX }] }]}
        {...(isPending ? panResponder.panHandlers : {})}
      >
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Open task ${bid.task.title}`}
          style={({ pressed }) => [
            styles.bidCard,
            { opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <View style={[styles.bidAccent, { backgroundColor: getBidAccentColor(bid) }]} />
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
                  {bid.task.general_location_name || t('myBids.card.locationNotSet')} · {budgetLabel}
                </Text>
              </View>
            </View>
            <StatusBadge status={bid.status === 'ACCEPTED' && bid.task.status === 'COMPLETED' ? 'COMPLETED' : bid.status} />
          </View>

          <View style={styles.bidDetails}>
            <View style={styles.priceRow}>
              <View>
                <Text style={[typography.caption, { color: brandColors.textMuted }]}>{t('myBids.card.yourOffer')}</Text>
                <Text style={styles.offerValue}>₪{bid.offered_price}</Text>
              </View>
              <View style={styles.priceTag}>
                <Text style={[typography.caption, styles.priceTagText]}>{t('myBids.card.budget', { value: budgetLabel })}</Text>
              </View>
            </View>
            <Text style={[typography.bodySm, styles.pitch]} numberOfLines={2}>
              {bid.description}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.dateRow}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={brandColors.textMuted} />
              <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                {t('myBids.card.submitted', { date: formatDate(bid.created_at) })}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              {isPending && (
                <>
                  <Pressable
                    style={[styles.actionBtn, styles.defaultActionBtn]}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit bid for ${bid.task.title}`}
                    onPress={(e) => { e.stopPropagation(); onEdit(bid); }}
                  >
                    <MaterialCommunityIcons name="pencil" size={13} color={brandColors.primaryMuted} />
                    <Text style={[typography.caption, { color: brandColors.primaryMuted, fontWeight: '600' }]}>{t('myBids.card.edit')}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.dangerActionBtn]}
                    accessibilityRole="button"
                    accessibilityLabel={`Withdraw bid for ${bid.task.title}`}
                    onPress={(e) => { e.stopPropagation(); onWithdraw(bid.id); }}
                  >
                    <MaterialCommunityIcons name="close-circle-outline" size={13} color={brandColors.danger} />
                    <Text style={[typography.caption, { color: brandColors.danger, fontWeight: '600' }]}>{t('myBids.card.withdraw')}</Text>
                  </Pressable>
                </>
              )}
              {bid.status === 'ACCEPTED' && bid.task.status !== 'COMPLETED' && (
                <Pressable
                  style={[styles.actionBtn, styles.dangerActionBtn]}
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel accepted job for ${bid.task.title}`}
                  onPress={(e) => { e.stopPropagation(); onCancelAccepted(bid); }}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={13} color={brandColors.danger} />
                  <Text style={[typography.caption, { color: brandColors.danger, fontWeight: '600' }]}>{t('myBids.card.cancelJob')}</Text>
                </Pressable>
              )}
              {bid.status === 'WITHDRAWN' && (
                <Pressable
                  style={[styles.actionBtn, styles.successActionBtn]}
                  accessibilityRole="button"
                  accessibilityLabel={`Reactivate bid for ${bid.task.title}`}
                  onPress={(e) => { e.stopPropagation(); onReactivate(bid.id); }}
                >
                  <MaterialCommunityIcons name="refresh" size={13} color={brandColors.success} />
                  <Text style={[typography.caption, { color: brandColors.success, fontWeight: '600' }]}>{t('myBids.card.reactivate')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthKey(dateStr: string | null): string {
  if (!dateStr) return 'unknown';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

export default function MyBidsScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const statusFilter = activeTab === 'COMPLETED' ? 'ACCEPTED' : activeTab === 'ALL' ? null : activeTab;

  const { bids: rawBids, loading, error, refetch, updateBidLocally, removeBidLocally } = useBids({
    status: statusFilter as BidStatus | null,
  });

  // All completed bids (before month filter)
  const allCompletedBids = rawBids.filter(
    (b) => b.status === 'ACCEPTED' && b.task.status === 'COMPLETED',
  );

  // Available months from completed bids
  const availableMonths = [...new Set(allCompletedBids.map((b) => getMonthKey(b.task.completed_at ?? b.created_at)))].sort().reverse();

  // Ensure selected month is valid — if current selection isn't in the list, pick the most recent
  const effectiveMonth =
    availableMonths.length > 0 && !availableMonths.includes(selectedMonth)
      ? availableMonths[0]
      : selectedMonth;

  const bids = rawBids
    .filter((b) => {
      if (activeTab === 'ALL') return b.status !== 'REJECTED' && !(b.status === 'ACCEPTED' && b.task.status === 'COMPLETED');
      if (activeTab === 'ACCEPTED') return b.status === 'ACCEPTED' && b.task.status !== 'COMPLETED';
      if (activeTab === 'COMPLETED') {
        if (b.status !== 'ACCEPTED' || b.task.status !== 'COMPLETED') return false;
        const monthKey = getMonthKey(b.task.completed_at ?? b.created_at);
        return monthKey === effectiveMonth;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'ACCEPTED' && b.status !== 'ACCEPTED') return -1;
      if (b.status === 'ACCEPTED' && a.status !== 'ACCEPTED') return 1;
      return 0;
    });

  // Summary for Completed tab (filtered by month)
  const completedTotal = activeTab === 'COMPLETED' ? bids.length : 0;
  const completedEarnings = activeTab === 'COMPLETED'
    ? bids.reduce((sum, b) => sum + b.offered_price, 0)
    : 0;
  const activeTabKey = TABS.find((tab) => tab.value === activeTab)?.key ?? 'active';
  const activeTabLabel = t(`myBids.tabs.${activeTabKey}`);
  const pipelineSummary = useMemo(() => {
    const activeJobs = bids.filter((b) => b.status === 'ACCEPTED' && b.task.status !== 'COMPLETED').length;
    const pendingOffers = bids.filter((b) => b.status === 'PENDING').length;
    const visibleValue = bids.reduce((sum, b) => sum + b.offered_price, 0);
    return { activeJobs, pendingOffers, visibleValue };
  }, [bids]);

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

  const webConfirm = useCallback((msg: string): boolean => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      return confirm(msg);
    }
    return true;
  }, []);

  const confirmBidAction = useCallback(({
    title,
    message,
    confirmLabel,
    destructive = false,
    onConfirm,
  }: {
    title: string;
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  }) => {
    if (Platform.OS === 'web') {
      if (webConfirm(`${title}\n\n${message}`)) void onConfirm();
      return;
    }

    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => void onConfirm(),
      },
    ]);
  }, [webConfirm, t]);

  const handleWithdraw = useCallback(
    (bidId: string) => {
      const bidTitle = bids.find((bid) => bid.id === bidId)?.task.title ?? 'this task';
      const doWithdraw = async () => {
        updateBidLocally(bidId, 'WITHDRAWN');
        try {
          await api.put(`/api/bids/${bidId}/withdraw`);
        } catch {
          refetch();
        }
      };

      confirmBidAction({
        title: t('myBids.actions.withdraw.title'),
        message: t('myBids.actions.withdraw.message', { title: bidTitle }),
        confirmLabel: t('myBids.actions.withdraw.confirm'),
        destructive: true,
        onConfirm: doWithdraw,
      });
    },
    [bids, confirmBidAction, updateBidLocally, refetch],
  );

  const handleEdit = useCallback((bid: UserBid) => {
    setEditingBid(bid);
    setEditPrice(String(bid.offered_price));
    setEditDescription(bid.description);
  }, []);

  const handleReactivate = useCallback(
    (bidId: string) => {
      const reactivatedBid = bids.find((b) => b.id === bidId);
      const bidTitle = reactivatedBid?.task.title ?? 'this task';
      const doReactivate = async (openEdit = false) => {
        updateBidLocally(bidId, 'PENDING');
        try {
          await api.put(`/api/bids/${bidId}/reactivate`);
          if (openEdit && reactivatedBid) {
            handleEdit({ ...reactivatedBid, status: 'PENDING' });
          }
        } catch {
          refetch();
        }
      };

      if (Platform.OS === 'web') {
        confirmBidAction({
          title: t('myBids.actions.reopen.title'),
          message: t('myBids.actions.reopen.message', { title: bidTitle }),
          confirmLabel: t('myBids.actions.reopen.confirm'),
          onConfirm: () => doReactivate(false),
        });
        return;
      }

      Alert.alert(t('myBids.actions.reopen.title'), t('myBids.actions.reopen.messageSimple', { title: bidTitle }), [
        { text: t('myBids.actions.reopen.keepWithdrawn'), style: 'cancel' },
        { text: t('myBids.actions.reopen.reopenAsIs'), onPress: () => void doReactivate(false) },
        { text: t('myBids.actions.reopen.reopenAndEdit'), onPress: () => void doReactivate(true) },
      ]);
    },
    [updateBidLocally, refetch, bids, handleEdit, confirmBidAction],
  );

  const handleDelete = useCallback(
    (bidId: string) => {
      const bidTitle = bids.find((bid) => bid.id === bidId)?.task.title ?? 'this task';
      const doDelete = async () => {
        removeBidLocally(bidId);
        try {
          await api.delete(`/api/bids/${bidId}`);
        } catch {
          refetch();
        }
      };

      confirmBidAction({
        title: t('myBids.actions.delete.title'),
        message: t('myBids.actions.delete.message', { title: bidTitle }),
        confirmLabel: t('myBids.actions.delete.confirm'),
        destructive: true,
        onConfirm: doDelete,
      });
    },
    [bids, confirmBidAction, removeBidLocally, refetch],
  );

  const handleCancelAccepted = useCallback(
    (bid: UserBid) => {
      const doCancelAccepted = async () => {
        try {
          await api.put(`/api/bids/${bid.id}/cancel-accepted`);
          refetch();
        } catch {
          // ignore
        }
      };

      confirmBidAction({
        title: t('myBids.actions.cancelAccepted.title'),
        message: t('myBids.actions.cancelAccepted.message', { title: bid.task.title }),
        confirmLabel: t('myBids.actions.cancelAccepted.confirm'),
        destructive: true,
        onConfirm: doCancelAccepted,
      });
    },
    [confirmBidAction, refetch],
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

  const emptyTitle = activeTab === 'ALL'
    ? t('myBids.empty.noActive.title')
    : t('myBids.empty.filtered.title', { tab: activeTabLabel.toLowerCase() });
  const emptyMessage = activeTab === 'ALL'
    ? t('myBids.empty.noActive.message')
    : t('myBids.empty.filtered.message', { tab: activeTabLabel.toLowerCase() });

  return (
    <View style={styles.container}>
      <View style={[styles.workspaceHeader, isWide && styles.workspaceHeaderWide]}>
        <View style={styles.workspaceHeaderMain}>
          <View style={styles.headerKickerRow}>
            <View style={styles.headerIconShell}>
              <MaterialCommunityIcons name="format-list-checks" size={17} color={brandColors.secondary} />
            </View>
            <Text style={styles.headerKicker}>{t('myBids.header.kicker')}</Text>
          </View>
          <Text style={styles.headerTitle}>{t('myBids.header.title')}</Text>
          <Text style={styles.headerSub} numberOfLines={2}>
            {t('myBids.header.sub', { tab: activeTabLabel, pending: pipelineSummary.pendingOffers, active: pipelineSummary.activeJobs })}
          </Text>
        </View>

        <View style={[styles.workspaceStats, isWide && styles.workspaceStatsWide]}>
          <View style={styles.workspaceStat}>
            <Text style={styles.workspaceStatValue}>{loading ? '...' : bids.length}</Text>
            <Text style={styles.workspaceStatLabel}>{t('myBids.stats.inView')}</Text>
          </View>
          <View style={styles.workspaceStat}>
            <Text style={styles.workspaceStatValue}>₪{pipelineSummary.visibleValue.toLocaleString()}</Text>
            <Text style={styles.workspaceStatLabel}>{t('myBids.stats.offerValue')}</Text>
          </View>
          <FButton variant="secondary" size="sm" icon="map-search-outline" onPress={handleFindJobs} style={styles.headerAction}>
            {t('myBids.stats.findJobs')}
          </FButton>
        </View>
      </View>

      {/* Tab filter */}
      <View style={styles.tabBar}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          contentContainerStyle={[styles.tabContent, isWide && styles.tabContentWide]}
          renderItem={({ item }) => (
            <FChip
              label={t(`myBids.tabs.${item.key}`)}
              selected={activeTab === item.value}
              onPress={() => setActiveTab(item.value)}
              compact
            />
          )}
        />
      </View>

      {/* Content */}
      {loading ? (
        <LoadingScreen label={t('myBids.loading')} />
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('myBids.error.title')}
          message={error}
          actionLabel={t('myBids.error.retry')}
          onAction={refetch}
        />
      ) : bids.length === 0 ? (
        <EmptyState
          icon={activeTab === 'ALL' ? 'hand-extended-outline' : 'filter-off-outline'}
          title={emptyTitle}
          message={emptyMessage}
          actionLabel={activeTab === 'ALL' ? t('myBids.empty.noActive.action') : undefined}
          onAction={activeTab === 'ALL' ? handleFindJobs : undefined}
        />
      ) : (
        <FlatList
          data={bids}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={activeTab === 'COMPLETED' ? (
            <View>
              {/* Month selector */}
              {availableMonths.length > 0 && (
                <FlatList
                  data={availableMonths}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item}
                  contentContainerStyle={styles.monthRow}
                  renderItem={({ item }) => (
                    <FChip
                      label={formatMonthLabel(item)}
                      selected={effectiveMonth === item}
                      onPress={() => setSelectedMonth(item)}
                      compact
                    />
                  )}
                />
              )}
              {/* Summary card for selected month */}
              <FCard style={styles.summaryCard}>
                <Text style={[typography.caption, { color: brandColors.textMuted, textAlign: 'center', marginBottom: spacing.sm }]}>
                  {formatMonthLabel(effectiveMonth)}
                </Text>
                <View style={styles.summaryContent}>
                  <View style={styles.summaryItem}>
                    <Text style={[typography.h1, { color: brandColors.primary }]}>{completedTotal}</Text>
                    <Text style={[typography.caption, { color: brandColors.textMuted }]}>{t('myBids.stats.jobs')}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[typography.h1, { color: brandColors.primary }]}>₪{completedEarnings.toLocaleString()}</Text>
                    <Text style={[typography.caption, { color: brandColors.textMuted }]}>{t('myBids.stats.earned')}</Text>
                  </View>
                </View>
              </FCard>
            </View>
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
                  accessibilityRole="button"
                  accessibilityLabel={`Delete bid for ${item.task.title}`}
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
            {t('myBids.editModal.title')}
          </Text>
          <FInput
            label={t('myBids.editModal.offer')}
            value={editPrice}
            onChangeText={setEditPrice}
            keyboardType="numeric"
          />
          <FInput
            label={t('myBids.editModal.description')}
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
            {t('myBids.editModal.save')}
          </FButton>
          <FButton variant="outline" onPress={() => setEditingBid(null)} fullWidth style={{ marginTop: spacing.sm }}>
            {t('myBids.editModal.cancel')}
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
  workspaceHeader: {
    backgroundColor: brandColors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexGrow: 0,
    flexShrink: 0,
    gap: spacing.lg,
    borderBottomWidth: 3,
    borderBottomColor: brandColors.secondary,
  },
  workspaceHeaderWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  workspaceHeaderMain: {
    flex: 1,
    gap: spacing.xs,
  },
  headerKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconShell: {
    width: 26,
    height: 26,
    borderRadius: radii.xs,
    backgroundColor: 'rgba(241,181,69,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(241,181,69,0.22)',
  },
  headerKicker: {
    ...typography.eyebrow,
    color: brandColors.secondary,
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.textOnDark,
  },
  headerSub: {
    ...typography.bodySm,
    color: brandColors.textOnDarkMuted,
    maxWidth: 560,
  },
  workspaceStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workspaceStatsWide: {
    justifyContent: 'flex-end',
    minWidth: 320,
  },
  workspaceStat: {
    minWidth: 98,
    flexGrow: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,252,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,252,246,0.14)',
  },
  workspaceStatValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.secondary,
  },
  workspaceStatLabel: {
    ...typography.caption,
    color: brandColors.textOnDarkMuted,
    marginTop: 1,
  },
  headerAction: {
    alignSelf: 'stretch',
  },
  tabBar: {
    backgroundColor: brandColors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brandColors.outlineLight,
    ...shadows.sm,
  },
  tabContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tabContentWide: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  listContent: {
    paddingVertical: spacing.lg,
    paddingBottom: spacing.huge,
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
    paddingLeft: spacing.lg + 4,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
    overflow: 'hidden',
  },
  bidAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
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
    gap: spacing.md,
  },
  offerValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: 0,
    color: brandColors.secondaryDark,
  },
  priceTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: brandColors.warningSoft,
    borderWidth: 1,
    borderColor: 'rgba(155,109,42,0.16)',
  },
  priceTagText: {
    color: brandColors.warning,
    fontWeight: '700',
  },
  pitch: {
    color: brandColors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  defaultActionBtn: {
    borderColor: brandColors.outline,
    backgroundColor: brandColors.surfaceAlt,
  },
  dangerActionBtn: {
    borderColor: brandColors.danger,
    backgroundColor: brandColors.dangerSoft,
  },
  successActionBtn: {
    borderColor: brandColors.success,
    backgroundColor: brandColors.successSoft,
  },
  monthRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: brandColors.outlineLight,
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
