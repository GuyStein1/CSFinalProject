import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useNotificationContext, type AppNotification } from '../context/NotificationContext';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { FButton } from '../components/ui';
import { brandColors, spacing, radii, typography } from '../theme';

const NOTIFICATION_ICONS: Record<string, string> = {
  NEW_BID: 'gavel',
  BID_ACCEPTED: 'check-circle-outline',
  BID_REJECTED: 'close-circle-outline',
  BID_WITHDRAWN: 'undo-variant',
  TASK_COMPLETED: 'flag-checkered',
  TASK_CANCELED: 'close-circle-outline',
  NEW_MESSAGE: 'message-text-outline',
};

function getIcon(type: string): string {
  return NOTIFICATION_ICONS[type] ?? 'bell-outline';
}

function getAccentColor(type: string): string {
  switch (type) {
    case 'BID_ACCEPTED':
    case 'TASK_COMPLETED':
      return brandColors.success;
    case 'BID_REJECTED':
      return brandColors.danger;
    case 'REVIEW_RECEIVED':
      return brandColors.secondary;
    default:
      return brandColors.primary;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function NotificationItem({
  notification,
  onPress,
  onDelete,
}: {
  notification: AppNotification;
  onPress: (n: AppNotification) => void;
  onDelete: (id: string) => void;
}) {
  const accent = getAccentColor(notification.type);
  const icon = getIcon(notification.type);

  return (
    <View style={styles.itemRow}>
      <Pressable
        style={({ pressed }) => [
          styles.item,
          !notification.is_read && styles.itemUnread,
          { opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => onPress(notification)}
      >
        <View style={[styles.iconCircle, { backgroundColor: accent + '18' }]}>
          <MaterialCommunityIcons name={icon as never} size={20} color={accent} />
        </View>

        <View style={styles.itemContent}>
          <Text
            style={[
              typography.bodyMedium,
              { color: brandColors.textPrimary },
              !notification.is_read && { fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text
            style={[typography.bodySm, { color: brandColors.textSecondary, marginTop: 2 }]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>
          <Text style={[typography.caption, { color: brandColors.textMuted, marginTop: spacing.xs }]}>
            {timeAgo(notification.created_at)}
          </Text>
        </View>

        {!notification.is_read && <View style={styles.unreadDot} />}
      </Pressable>

      <Pressable
        style={styles.trashBtn}
        hitSlop={8}
        onPress={() => onDelete(notification.id)}
      >
        <MaterialCommunityIcons name="delete-outline" size={22} color={brandColors.danger} />
      </Pressable>
    </View>
  );
}

export default function NotificationCenterScreen() {
  const navigation = useNavigation();
  const {
    notifications,
    unreadCount: unreadCountFn,
    loading,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteOne,
    deleteAll,
  } = useNotificationContext();
  const unreadCount = unreadCountFn();

  useFocusEffect(
    React.useCallback(() => {
      refetch().then(() => {
        // Mark all as read after a short delay so user sees the unread styling briefly
        setTimeout(() => markAllAsRead(), 1500);
      });
    }, [refetch, markAllAsRead]),
  );

  const handlePress = (notification: AppNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (!notification.related_entity_id) return;
    const nav = navigation as never as { navigate: (s: string, p: object) => void };

    if (notification.type === 'NEW_MESSAGE') {
      nav.navigate('Chat', { taskId: notification.related_entity_id });
      return;
    }

    if (notification.related_entity_type === 'Task') {
      const isFixerNotif = ['BID_ACCEPTED', 'BID_REJECTED', 'TASK_COMPLETED', 'TASK_CANCELED'].includes(notification.type);
      nav.navigate(
        isFixerNotif ? 'TaskDetailsFixer' : 'TaskDetails',
        { taskId: notification.related_entity_id },
      );
    }
  };

  if (loading && notifications.length === 0) {
    return <LoadingScreen label="Loading notifications..." />;
  }

  return (
    <View style={styles.container}>
      {/* Top action bar */}
      {notifications.length > 0 && (
        <View style={styles.topBar}>
          {unreadCount > 0 ? (
            <FButton variant="ghost" size="sm" onPress={markAllAsRead}>
              Mark all as read
            </FButton>
          ) : (
            <View />
          )}
          <Pressable style={styles.deleteAllBtn} onPress={deleteAll}>
            <MaterialCommunityIcons name="delete-outline" size={18} color={brandColors.danger} />
            <Text style={[typography.bodySm, { color: brandColors.danger, marginLeft: spacing.xs }]}>
              Delete All
            </Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={handlePress} onDelete={deleteOne} />
        )}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshing={loading}
        onRefresh={refetch}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bell-off-outline"
            title="No notifications"
            message="You're all caught up! Notifications will appear here."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: brandColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.outlineLight,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors.surface,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: brandColors.surface,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  deleteAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  itemUnread: {
    backgroundColor: brandColors.infoSoft,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brandColors.primary,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: brandColors.outlineLight,
    marginLeft: spacing.lg + 40 + spacing.md, // aligned with content
  },
});
