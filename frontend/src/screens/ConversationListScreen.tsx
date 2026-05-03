import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../api/axiosInstance';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { brandColors, radii, spacing, typography } from '../theme';

interface OtherParty {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Conversation {
  taskId: string;
  taskTitle: string;
  taskStatus?: string;
  otherParty: OtherParty | null;
  lastMessage: { content: string; timestamp: string } | null;
  unreadCount: number;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ConversationListScreen({ route }: { route?: { params?: { mode?: string } } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
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

  if (loading) return <LoadingScreen label="Loading messages…" />;

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.taskId}
      contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <EmptyState
          icon="chat-outline"
          title="No conversations yet"
          message="Start a chat from a task once a bid is accepted."
        />
      }
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
            {/* Avatar — tap to view public profile */}
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

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={[typography.label, styles.name]} numberOfLines={1}>
                  {other?.full_name || 'User'}
                </Text>
                {item.lastMessage && (
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                    {formatTime(item.lastMessage.timestamp)}
                  </Text>
                )}
              </View>
              <Text style={[typography.caption, { color: brandColors.textMuted }]} numberOfLines={1}>
                {item.taskTitle}
              </Text>
              <View style={styles.bottomRow}>
                <Text
                  style={[
                    typography.bodySm,
                    { color: item.unreadCount > 0 ? brandColors.textPrimary : brandColors.textMuted, flex: 1 },
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage?.content || 'No messages yet'}
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
});
