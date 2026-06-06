import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import api from '../api/axiosInstance';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { FButton } from '../components/ui';
import { Conversation, formatConversationTime } from './ConversationListScreen';
import { brandColors, radii, spacing, typography } from '../theme';

export default function PastConversationsScreen({ route }: { route?: { params?: { mode?: string } } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const mode = route?.params?.mode;

  const load = useCallback(async () => {
    try {
      const params = mode ? { mode } : {};
      const res = await api.get('/api/conversations', { params });
      const all: Conversation[] = res.data.conversations ?? [];
      setConversations(
        all.filter((c) => c.taskStatus === 'COMPLETED' || c.taskStatus === 'CANCELED'),
      );
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const deleteConversation = (taskId: string, taskTitle: string) => {
    const doDelete = async () => {
      try {
        await api.delete(`/api/tasks/${taskId}/messages`);
        setConversations((prev) => prev.filter((c) => c.taskId !== taskId));
      } catch {
        if (Platform.OS === 'web') {
          window.alert(t('pastConversations.deleteFailed'));
        } else {
          Alert.alert(t('common.error'), t('pastConversations.deleteFailed'));
        }
      }
    };

    if (Platform.OS === 'web') {
      if (confirm(t('pastConversations.deleteConfirmMessage', { title: taskTitle }))) {
        void doDelete();
      }
    } else {
      Alert.alert(
        t('pastConversations.deleteConfirmTitle'),
        t('pastConversations.deleteConfirmMessage', { title: taskTitle }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: () => void doDelete() },
        ],
      );
    }
  };

  const handleDeleteAll = () => {
    const title = t('pastConversations.deleteAllConfirm.title');
    const message = t('pastConversations.deleteAllConfirm.message');
    const confirmLabel = t('pastConversations.deleteAllConfirm.confirm');

    const doDeleteAll = async () => {
      try {
        await Promise.all(conversations.map((c) => api.delete(`/api/tasks/${c.taskId}/messages`)));
        setConversations([]);
      } catch {
        if (Platform.OS === 'web') {
          window.alert(t('pastConversations.deleteFailed'));
        } else {
          Alert.alert(t('common.error'), t('pastConversations.deleteFailed'));
        }
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(`${title}\n${message}`)) {
        void doDeleteAll();
      }
    } else {
      Alert.alert(title, message, [
        { text: t('common.cancel') },
        { text: confirmLabel, style: 'destructive', onPress: () => void doDeleteAll() },
      ]);
    }
  };

  if (loading) return <LoadingScreen label={t('conversations.loading')} />;

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.taskId}
      contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={conversations.length > 0 ? (
        <View style={styles.topBar}>
          <View />
          <FButton variant="outline" size="sm" icon="delete-sweep-outline" onPress={handleDeleteAll}>
            {t('pastConversations.deleteAll')}
          </FButton>
        </View>
      ) : null}
      ListEmptyComponent={
        <EmptyState
          icon="archive-outline"
          title={t('pastConversations.empty.title')}
          message={t('pastConversations.empty.message')}
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
                <Text style={[typography.label, styles.name]} numberOfLines={1}>
                  {other?.full_name || 'User'}
                </Text>
                {item.lastMessage && (
                  <Text style={[typography.caption, { color: brandColors.textMuted }]}>
                    {formatConversationTime(item.lastMessage.timestamp, t)}
                  </Text>
                )}
              </View>
              <Text style={[typography.caption, { color: brandColors.textMuted }]} numberOfLines={1}>
                {item.taskTitle}
              </Text>
              <Text
                style={[typography.bodySm, { color: brandColors.textMuted, flex: 1 }]}
                numberOfLines={1}
              >
                {item.lastMessage?.content || t('conversations.noMessages')}
              </Text>
            </View>

            <Pressable
              style={styles.deleteBtn}
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation();
                deleteConversation(item.taskId, item.taskTitle);
              }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={brandColors.danger} />
            </Pressable>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
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
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
