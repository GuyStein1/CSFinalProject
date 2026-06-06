import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import api from '../api/axiosInstance';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { brandColors, radii, spacing, typography } from '../theme';

interface OtherParty {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Conversation {
  taskId: string;
  taskTitle: string;
  taskStatus?: string;
  userRole: 'requester' | 'fixer';
  otherParty: OtherParty | null;
  lastMessage: { content: string; timestamp: string } | null;
  unreadCount: number;
}

export function formatConversationTime(dateStr: string, t: (key: string) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return t('conversations.yesterday');
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ConversationListScreen({ route }: { route?: { params?: { mode?: string } } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const mode = route?.params?.mode;

  const load = useCallback(async () => {
    try {
      const params = mode ? { mode } : {};
      const res = await api.get('/api/conversations', { params });
      setConversations(res.data.conversations ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void load();
  }, [load]));

  if (loading) return <LoadingScreen label={t('conversations.loading')} />;

  const activeConversations = conversations.filter(
    (c) => c.taskStatus !== 'COMPLETED' && c.taskStatus !== 'CANCELED',
  );
  const pastCount = conversations.filter(
    (c) => c.taskStatus === 'COMPLETED' || c.taskStatus === 'CANCELED',
  ).length;

  return (
    <FlatList
      data={activeConversations}
      keyExtractor={(item) => item.taskId}
      contentContainerStyle={activeConversations.length === 0 && pastCount === 0 ? styles.emptyContainer : styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <EmptyState
          icon="chat-outline"
          title={t('conversations.empty.title')}
          message={t('conversations.empty.message')}
        />
      }
      ListFooterComponent={pastCount > 0 ? (
        <Pressable
          style={styles.pastButton}
          onPress={() => navigation.navigate('PastConversations', { mode })}
        >
          <MaterialCommunityIcons name="archive-outline" size={20} color={brandColors.textMuted} />
          <Text style={[typography.label, { color: brandColors.textMuted, flex: 1 }]}>
            {t('conversations.past')} ({pastCount})
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={brandColors.outlineLight} />
        </Pressable>
      ) : null}
      renderItem={({ item }) => {
        const other = item.otherParty;
        return (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() =>
              navigation.navigate('Chat', {
                taskId: item.taskId,
                recipientId: other?.id,
                recipientName: other?.full_name || 'User',
                recipientAvatar: other?.avatar_url || null,
                taskTitle: item.taskTitle,
                taskStatus: item.taskStatus,
              })
            }
          >
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                if (other?.id) navigation.navigate('PublicProfile', { userId: other.id });
              }}
            >
              {other?.avatar_url ? (
                <Avatar.Image size={48} source={{ uri: other.avatar_url }} />
              ) : (
                <Avatar.Icon
                  size={48}
                  icon="account"
                  style={{ backgroundColor: brandColors.primaryMuted }}
                />
              )}
            </Pressable>

            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={[typography.label, styles.name, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                  {other?.full_name || 'User'}
                </Text>
                {item.lastMessage && (
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                    {formatConversationTime(item.lastMessage.timestamp, t)}
                  </Text>
                )}
              </View>
              <View style={styles.titleRow}>
                <Text style={[typography.caption, { color: brandColors.textMuted, flex: 1, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                  {item.taskTitle}
                </Text>
                <View style={[styles.rolePill, { backgroundColor: item.userRole === 'requester' ? brandColors.primary : brandColors.secondary }]}>
                  <Text style={styles.rolePillText}>{t(`nav.mode.${item.userRole}`)}</Text>
                </View>
              </View>
              <View style={styles.bottomRow}>
                <Text
                  style={[
                    typography.bodySm,
                    { color: item.unreadCount > 0 ? brandColors.textPrimary : brandColors.textMuted, flex: 1, textAlign: isRTL ? 'right' : 'left' },
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage?.content || t('conversations.noMessages')}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>

            <MaterialCommunityIcons name="chevron-right" size={20} color={brandColors.outlineLight} />
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: brandColors.outlineLight,
    marginLeft: 48 + spacing.md * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: brandColors.surface,
  },
  rowPressed: {
    backgroundColor: brandColors.surfaceAlt,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    color: brandColors.textPrimary,
    marginRight: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: brandColors.primary,
    borderRadius: radii.pill,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: brandColors.white,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  rolePillText: {
    color: brandColors.white,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  pastButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: brandColors.outlineLight,
    marginTop: spacing.sm,
  },
});
