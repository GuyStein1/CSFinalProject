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
import { Card, Chip, Icon, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../api/axiosInstance';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingScreen from '../components/LoadingScreen';
import useBids, { type BidStatus, type UserBid } from '../hooks/useBids';
import { brandColors } from '../theme';

type TabFilter = 'ALL' | BidStatus;

const TABS: { value: TabFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
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
}

function BidCard({ bid, onPress, onWithdraw }: BidCardProps) {
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

            <Text variant="bodySmall" style={styles.dateText}>
              Submitted {formatDate(bid.created_at)}
            </Text>
          </Card.Content>
        </Card>
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
  dateText: {
    color: brandColors.textMuted,
  },
});
