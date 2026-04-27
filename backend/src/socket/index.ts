import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { prisma } from '../config/prisma';
import admin from '../config/firebaseAdmin';
import { sendNotification } from '../services/notificationService';
import { NotificationType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId: string;
}

export function initSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

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

    // join_chat — validate membership then join isolated room for this task
    socket.on('join_chat', async (taskId: string) => {
      try {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) return;

        const isMember =
          task.requester_id === authedSocket.userId ||
          task.assigned_fixer_id === authedSocket.userId;
        if (!isMember) return;

        socket.join(`task_chat_${taskId}`);
      } catch (err) {
        console.error('[socket] join_chat error', err);
      }
    });

    // send_message — persist to DB, broadcast to room, push-notify offline recipient
    socket.on(
      'send_message',
      async (payload: { taskId: string; content: string }) => {
        try {
          const { taskId, content } = payload;
          if (!taskId || !content?.trim()) return;

          const task = await prisma.task.findUnique({ where: { id: taskId } });
          if (!task) return;

          const isMember =
            task.requester_id === authedSocket.userId ||
            task.assigned_fixer_id === authedSocket.userId;
          if (!isMember) return;

          const recipientId =
            task.requester_id === authedSocket.userId
              ? task.assigned_fixer_id
              : task.requester_id;

          if (!recipientId) return;

          const message = await prisma.message.create({
            data: {
              task_id: taskId,
              sender_id: authedSocket.userId,
              recipient_id: recipientId,
              content: content.trim(),
            },
            include: {
              sender: { select: { id: true, full_name: true, avatar_url: true } },
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
            await sendNotification(
              recipientId,
              'New message',
              content.trim(),
              NotificationType.NEW_MESSAGE,
              taskId,
              'Task',
            );
          }
        } catch (err) {
          console.error('[socket] send_message error', err);
        }
      },
    );
  });

  return io;
}
