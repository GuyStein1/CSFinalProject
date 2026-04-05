import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import { FChip } from '../components/ui';
import useBids, { type BidStatus, type UserBid } from '../hooks/useBids';
import { brandColors, spacing, radii, shadows, typography } from '../theme';

type TabFilter = 'ALL' | BidStatus;

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
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
}

function BidCard({ bid, onPress, onWithdraw }: BidCardProps) {
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

          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={brandColors.textMuted} />
            <Text style={[typography.caption, { color: brandColors.textMuted }]}>
              Submitted {formatDate(bid.created_at)}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function MyBidsScreen() {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const statusFilter = activeTab === 'ALL' ? null : activeTab;

  const { bids, loading, error, refetch, updateBidLocally } = useBids({
    status: statusFilter,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleWithdraw = useCallback(
    async (bidId: string) => {
      updateBidLocally(bidId, 'WITHDRAWN');
      try {
        await api.put(`/api/bids/${bidId}/withdraw`);
      } catch {
        refetch();
      }
    },
    [updateBidLocally, refetch],
  );

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
          renderItem={({ item }) => (
            <BidCard
              bid={item}
              onPress={() => handleBidPress(item.task_id)}
              onWithdraw={handleWithdraw}
            />
          )}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={loading}
        />
      )}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
});
