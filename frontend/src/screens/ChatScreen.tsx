import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/axiosInstance';
import { getSocket } from '../utils/socket';
import { FButton, FInput } from '../components/ui';
import LoadingScreen from '../components/LoadingScreen';
import { brandColors, radii, spacing, typography } from '../theme';
import { auth } from '../config/firebase';

interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ChatScreenParams {
  taskId: string;
  recipientId?: string;
  recipientName?: string;
  recipientAvatar?: string | null;
  taskTitle?: string;
  taskStatus?: string;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ChatScreen({ route }: { route: any }) {
  const {
    taskId,
    recipientId,
    recipientName = 'User',
    recipientAvatar = null,
    taskTitle = '',
    taskStatus = 'IN_PROGRESS',
  } = (route.params ?? {}) as ChatScreenParams;

  const navigation = useNavigation();
  const myId = auth.currentUser?.uid;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const socketRef = useRef<Awaited<ReturnType<typeof getSocket>> | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  const isReadOnly = taskStatus === 'COMPLETED';

  // Set header dynamically
  useEffect(() => {
    navigation.setOptions({
      title: taskTitle || 'Chat',
      headerRight: () =>
        recipientAvatar ? (
          <Avatar.Image size={32} source={{ uri: recipientAvatar }} style={{ marginRight: spacing.md }} />
        ) : (
          <Avatar.Icon
            size={32}
            icon="account"
            style={{ backgroundColor: brandColors.primaryMuted, marginRight: spacing.md }}
          />
        ),
    });
  }, [navigation, taskTitle, recipientAvatar]);

  // Load chat history
  const loadMessages = useCallback(async (p: number) => {
    try {
      const res = await api.get(`/api/tasks/${taskId}/messages`, { params: { page: p, limit: 30 } });
      const fetched: Message[] = res.data.messages ?? [];
      if (p === 1) {
        setMessages(fetched);
      } else {
        setMessages(prev => [...fetched, ...prev]);
      }
      if (fetched.length < 30) setHasMore(false);
    } catch {
      // history unavailable — chat still usable via socket
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Connect socket and join room
  useEffect(() => {
    void loadMessages(1);

    void (async () => {
      const socket = await getSocket();
      socketRef.current = socket;
      socket.emit('join_chat', { taskId });
      socket.on('receive_message', (msg: Message) => {
        setMessages(prev => [...prev, msg]);
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    })();

    return () => {
      socketRef.current?.off('receive_message');
    };
  }, [taskId, loadMessages]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !socketRef.current) return;
    setText('');
    setSending(true);

    // Optimistic bubble
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      task_id: taskId,
      sender_id: myId ?? '',
      recipient_id: recipientId ?? '',
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    flatListRef.current?.scrollToEnd({ animated: true });

    socketRef.current.emit('send_message', { taskId, content });
    setSending(false);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    void loadMessages(nextPage);
  };

  if (loading) return <LoadingScreen label="Loading chat..." />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Recipient name subtitle */}
      {recipientName ? (
        <View style={styles.subHeader}>
          <Text style={[typography.caption, { color: brandColors.textMuted }]}>
            {recipientName}
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        renderItem={({ item }) => {
          const isMine = item.sender_id === myId;
          return (
            <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
              {!isMine && (
                recipientAvatar ? (
                  <Avatar.Image size={28} source={{ uri: recipientAvatar }} style={styles.bubbleAvatar} />
                ) : (
                  <Avatar.Icon size={28} icon="account" style={[styles.bubbleAvatar, { backgroundColor: brandColors.primaryMuted }]} />
                )
              )}
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, { color: isMine ? brandColors.white : brandColors.textPrimary }]}>
                  {item.content}
                </Text>
                <Text style={[typography.caption, styles.bubbleTime, { color: isMine ? 'rgba(255,255,255,0.65)' : brandColors.textMuted }]}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="chat-outline" size={40} color={brandColors.outlineLight} />
            <Text style={[typography.body, { color: brandColors.textMuted, marginTop: spacing.md, textAlign: 'center' }]}>
              No messages yet.{'\n'}Say hello!
            </Text>
          </View>
        }
      />

      {isReadOnly ? (
        <View style={styles.readOnlyBar}>
          <MaterialCommunityIcons name="lock-outline" size={14} color={brandColors.textMuted} />
          <Text style={[typography.caption, { color: brandColors.textMuted, marginLeft: spacing.xs }]}>
            This task is completed. Chat is archived.
          </Text>
        </View>
      ) : (
        <View style={styles.footer}>
          <FInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            returnKeyType="send"
            onSubmitEditing={() => void handleSend()}
            blurOnSubmit={false}
          />
          <FButton
            icon="send"
            onPress={() => void handleSend()}
            loading={sending}
            disabled={!text.trim() || sending}
            style={styles.sendBtn}
          >
            {''}
          </FButton>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors.background,
  },
  subHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: brandColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: brandColors.outlineLight,
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 3,
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleAvatar: {
    marginRight: spacing.xs,
  },
  bubble: {
    maxWidth: '72%',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleMine: {
    backgroundColor: brandColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: brandColors.surfaceAlt,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTime: {
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: brandColors.surface,
    borderTopWidth: 1,
    borderTopColor: brandColors.outlineLight,
  },
  input: {
    flex: 1,
  },
  sendBtn: {
    minWidth: 44,
  },
  readOnlyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: brandColors.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: brandColors.outlineLight,
  },
});
