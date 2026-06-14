import React from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { useNotificationContext, type AppNotification, FIXER_NOTIF_TYPES, REQUESTER_NOTIF_TYPES } from '../context/NotificationContext';
import { useActiveMode } from '../context/ActiveModeContext';
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

function getNotificationRole(n: AppNotification): 'requester' | 'fixer' | null {
  if (n.user_role === 'requester' || n.user_role === 'fixer') return n.user_role;
  if (FIXER_NOTIF_TYPES.includes(n.type)) return 'fixer';
  if (REQUESTER_NOTIF_TYPES.includes(n.type)) return 'requester';
  return null;
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

function NotificationItem({
  notification,
  onPress,
  onDelete,
}: {
  notification: AppNotification;
  onPress: (n: AppNotification) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const dateLocale = language === 'he' ? 'he-IL' : 'en-US';
  const accent = getAccentColor(notification.type);
  const icon = getIcon(notification.type);

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t('notifications.justNow');
    if (mins < 60) return t('notifications.timeAgo.minutes', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('notifications.timeAgo.hours', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('notifications.timeAgo.days', { count: days });
    return new Date(dateStr).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.itemRow, isRTL && { direction: 'rtl' as const }]}>
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
              { color: brandColors.textPrimary, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
              !notification.is_read && { fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text
            style={[typography.bodySm, { color: brandColors.textSecondary, marginTop: 2, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' }]}
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
  const { t } = useTranslation();
  const { activeMode } = useActiveMode();
  const {
    notifications,
    loading,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteOne,
    deleteAll,
  } = useNotificationContext();

  // Filter by active mode using inferred role so old null-role records are classified by type
  const filtered = notifications.filter(n => {
    const role = getNotificationRole(n);
    return role === activeMode || role === null;
  });
  const unreadCount = filtered.filter(n => !n.is_read).length;

  useFocusEffect(
    React.useCallback(() => {
      refetch().then(() => {
        // Mark all as read after a short delay so user sees the unread styling briefly
        setTimeout(() => markAllAsRead(activeMode), 1500);
      });
    }, [refetch, markAllAsRead, activeMode]),
  );

  const handleDeleteAll = () => {
    const title = t('notifications.deleteAllConfirm.title');
    const message = t('notifications.deleteAllConfirm.message');
    const confirmLabel = t('notifications.deleteAllConfirm.confirm');

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`${title}\n${message}`)) {
        deleteAll();
      }
    } else {
      Alert.alert(title, message, [
        { text: t('common.cancel') },
        { text: confirmLabel, style: 'destructive', onPress: () => deleteAll() },
      ]);
    }
  };

  const handlePress = (notification: AppNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (!notification.related_entity_id) return;
    const nav = navigation as never as { navigate: (s: string, p?: object) => void };

    // Auto-switch to the correct mode before navigating
    const notifRole = notification.user_role;
    if (notifRole && notifRole !== activeMode) {
      nav.navigate('Main', { screen: notifRole === 'fixer' ? 'FixerMode' : 'RequesterMode' });
    }

    if (notification.type === 'NEW_MESSAGE') {
      nav.navigate('Chat', { taskId: notification.related_entity_id });
      return;
    }

    if (notification.related_entity_type === 'Task') {
      const isFixerNotif = notifRole === 'fixer' ||
        ['BID_ACCEPTED', 'BID_REJECTED'].includes(notification.type);
      nav.navigate(
        isFixerNotif ? 'TaskDetailsFixer' : 'TaskDetails',
        { taskId: notification.related_entity_id },
      );
    }
  };

  if (loading && filtered.length === 0) {
    return <LoadingScreen label={t('notifications.loading')} />;
  }

  return (
    <View style={styles.container}>
      {/* Top action bar */}
      {filtered.length > 0 && (
        <View style={styles.topBar}>
          {unreadCount > 0 ? (
            <FButton variant="ghost" size="sm" onPress={() => markAllAsRead(activeMode)}>
              {t('notifications.markAllRead')}
            </FButton>
          ) : (
            <View />
          )}
          <FButton variant="outline" size="sm" icon="delete-sweep-outline" onPress={handleDeleteAll}>
            {t('notifications.deleteAll')}
          </FButton>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={handlePress} onDelete={deleteOne} />
        )}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshing={loading}
        onRefresh={refetch}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bell-off-outline"
            title={t('notifications.empty.title')}
            message={t('notifications.empty.message')}
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
