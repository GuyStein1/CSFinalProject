import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { prisma } from '../config/prisma';
import admin from '../config/firebaseAdmin';
import { sendNotification } from '../services/notificationService';
import { getNotificationText } from '../utils/notificationMessages';
import { NotificationType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId: string;
}

let ioInstance: SocketServer | null = null;

/** Get the live Socket.io server instance (available after initSocket is called). */
export function getIO(): SocketServer | null {
  return ioInstance;
}

export function initSocket(httpServer: HttpServer): SocketServer {
  const corsOrigin = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : '*';
  const io = new SocketServer(httpServer, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  });
  ioInstance = io;

  // Auth handshake — verify Firebase token and attach userId to socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Missing auth token'));

      if (!admin.apps.length) return next(new Error('Firebase Admin not initialized'));

      const decoded = await admin.auth().verifyIdToken(token);
      const user = await prisma.user.findUnique({ where: { firebase_uid: decoded.uid } });
      if (!user) return next(new Error('User not found'));

      (socket as AuthenticatedSocket).userId = user.id;
      next();
    } catch {
      next(new Error('Invalid auth token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authedSocket = socket as AuthenticatedSocket;

    // join_chat — only the task requester or the accepted fixer may join
    socket.on('join_chat', async (taskId: string) => {
      try {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
          socket.emit('error', { message: 'Task not found' });
          return;
        }

        const isParticipant =
          task.requester_id === authedSocket.userId ||
          task.assigned_fixer_id === authedSocket.userId;

        if (!isParticipant) {
          socket.emit('error', { message: 'Not a participant in this task' });
          return;
        }

        socket.join(`task_chat_${taskId}`);
      } catch (err) {
        console.error('[socket] join_chat error', err);
      }
    });

    // send_message — persist to DB, broadcast to room, push-notify offline recipient
    socket.on(
      'send_message',
      async (payload: { taskId: string; content: string; recipientId?: string }) => {
        try {
          const { taskId, content } = payload;
          if (!taskId || !content?.trim()) return;

          const task = await prisma.task.findUnique({ where: { id: taskId } });
          if (!task) return;

          const isTaskMember =
            task.requester_id === authedSocket.userId ||
            task.assigned_fixer_id === authedSocket.userId;

          const activeBid = isTaskMember
            ? null
            : await prisma.bid.findFirst({
                where: {
                  task_id: taskId,
                  fixer_id: authedSocket.userId,
                  status: { in: ['PENDING', 'ACCEPTED'] },
                },
              });

          if (!isTaskMember && !activeBid) return;

          let recipientId: string | null;
          if (task.requester_id === authedSocket.userId) {
            // sender is requester — use assigned fixer or the hint from the client (pending-bid chat)
            recipientId = task.assigned_fixer_id ?? payload.recipientId ?? null;
          } else {
            // sender is fixer — recipient is always the requester
            recipientId = task.requester_id;
          }

          if (!recipientId) return;

          const message = await prisma.message.create({
            data: {
              task_id: taskId,
              sender_id: authedSocket.userId,
              recipient_id: recipientId,
              content: content.trim(),
            },
            include: {
              sender: { select: { id: true, firebase_uid: true, full_name: true, avatar_url: true } },
            },
          });

          io.to(`task_chat_${taskId}`).emit('receive_message', message);

          // Push-notify recipient only if they are not currently in the room
          const room = io.sockets.adapter.rooms.get(`task_chat_${taskId}`);
          const recipientInRoom = room
            ? [...room].some((sid) => {
                const s = io.sockets.sockets.get(sid) as AuthenticatedSocket | undefined;
                return s?.userId === recipientId;
              })
            : false;

          if (!recipientInRoom) {
            const recipientRole = recipientId === task.requester_id ? 'requester' : 'fixer';
            const msgNt = await getNotificationText(recipientId, 'newMessage', {});
            await sendNotification(recipientId, msgNt.title, content.trim(), NotificationType.NEW_MESSAGE, taskId, 'Task', recipientRole);
          }
        } catch (err) {
          console.error('[socket] send_message error', err);
        }
      },
    );

    // mark_read — batch-update unread messages and notify the sender in real-time
    socket.on('mark_read', async (taskId: string) => {
      try {
        if (!taskId) return;

        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) return;

        const userId = authedSocket.userId;
        const isMember =
          task.requester_id === userId || task.assigned_fixer_id === userId;
        const hasBid = isMember
          ? true
          : !!(await prisma.bid.findFirst({
              where: { task_id: taskId, fixer_id: userId, status: { in: ['PENDING', 'ACCEPTED'] } },
            }));
        if (!isMember && !hasBid) return;

        // Find unread messages sent TO this user, then mark them read
        const unreadMessages = await prisma.message.findMany({
          where: { task_id: taskId, recipient_id: userId, is_read: false },
          select: { id: true, sender_id: true },
        });

        if (unreadMessages.length === 0) return;

        await prisma.message.updateMany({
          where: { task_id: taskId, recipient_id: userId, is_read: false },
          data: { is_read: true },
        });

        const messageIds = unreadMessages.map((m) => m.id);

        // Emit to the room so the sender's UI can show read indicators
        io.to(`task_chat_${taskId}`).emit('messages_read', {
          taskId,
          readerId: userId,
          messageIds,
        });
      } catch (err) {
        console.error('[socket] mark_read error', err);
      }
    });
  });

  return io;
}
