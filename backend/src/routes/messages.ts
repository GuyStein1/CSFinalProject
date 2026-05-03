import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { getIO } from '../socket';

const router = Router();

router.use(authMiddleware);

// GET /api/tasks/:id/messages — paginated chat history for a task participant (oldest-first)
router.get('/tasks/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    const userId = req.user!.id;
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
    const rawLimit = parseInt((req.query.limit as string) ?? '30', 10);
    const limit = Math.min(100, Math.max(1, rawLimit));

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError('Task not found');

    const isMember =
      task.requester_id === userId || task.assigned_fixer_id === userId;
    const bid = isMember
      ? null
      : await prisma.bid.findFirst({
          where: { task_id: taskId, fixer_id: userId, status: { in: ['PENDING', 'ACCEPTED'] } },
        });
    if (!isMember && !bid) throw new ForbiddenError('Not a participant in this chat');

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { task_id: taskId },
        orderBy: { created_at: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, firebase_uid: true, full_name: true, avatar_url: true } },
        },
      }),
      prisma.message.count({ where: { task_id: taskId } }),
    ]);

    res.json({ messages, meta: { total, page, limit } });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations — conversation summaries for the authenticated user (sorted by most recent)
// Optional query param: ?mode=requester|fixer — filters by role in the task
router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const mode = req.query.mode as string | undefined;

    // Build role filter based on mode
    const roleFilter =
      mode === 'requester'
        ? { requester_id: userId }
        : mode === 'fixer'
          ? { NOT: { requester_id: userId } }
          : {};

    // Find all tasks where the user has sent or received messages
    const tasks = await prisma.task.findMany({
      where: {
        ...roleFilter,
        messages: {
          some: {
            OR: [{ sender_id: userId }, { recipient_id: userId }],
          },
        },
      },
      include: {
        requester: { select: { id: true, full_name: true, avatar_url: true } },
        fixer: { select: { id: true, full_name: true, avatar_url: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, full_name: true, avatar_url: true } },
            recipient: { select: { id: true, full_name: true, avatar_url: true } },
          },
        },
      },
    });

    const taskIds = tasks.map((t) => t.id);
    const unreadCounts = await prisma.message.groupBy({
      by: ['task_id'],
      where: {
        task_id: { in: taskIds },
        recipient_id: userId,
        is_read: false,
      },
      _count: { id: true },
    });

    const unreadMap = new Map(unreadCounts.map((r) => [r.task_id, r._count.id]));

    const conversations = tasks
      .map((task) => {
        // Determine the other party
        let otherParty: { id: string; full_name: string; avatar_url: string | null } | null = null;
        const lastMsg = task.messages[0];
        if (task.requester_id === userId) {
          // User is requester — show fixer, or message counterpart
          otherParty = task.fixer ?? (lastMsg?.sender?.id !== userId ? lastMsg?.sender : lastMsg?.recipient) ?? null;
        } else {
          otherParty = task.requester;
        }
        // Final safety: never show ourselves
        if (otherParty?.id === userId) {
          otherParty = lastMsg?.sender?.id !== userId ? lastMsg?.sender ?? null : lastMsg?.recipient ?? null;
        }

        const lastMessage = task.messages[0] ?? null;

        return {
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          otherParty,
          lastMessage: lastMessage
            ? { content: lastMessage.content, timestamp: lastMessage.created_at }
            : null,
          unreadCount: unreadMap.get(task.id) ?? 0,
        };
      })
      .sort((a, b) => {
        const aTime = a.lastMessage?.timestamp.getTime() ?? 0;
        const bTime = b.lastMessage?.timestamp.getTime() ?? 0;
        return bTime - aTime;
      });

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id/messages/read — mark all unread messages received by the caller in this task as read
router.put('/tasks/:id/messages/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    const userId = req.user!.id;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError('Task not found');

    const isMember =
      task.requester_id === userId || task.assigned_fixer_id === userId;
    const bid = isMember
      ? null
      : await prisma.bid.findFirst({
          where: { task_id: taskId, fixer_id: userId, status: { in: ['PENDING', 'ACCEPTED'] } },
        });
    if (!isMember && !bid) throw new ForbiddenError('Not a participant in this chat');

    // Find which messages will be marked so we can notify the sender
    const unreadMessages = await prisma.message.findMany({
      where: { task_id: taskId, recipient_id: userId, is_read: false },
      select: { id: true },
    });

    await prisma.message.updateMany({
      where: { task_id: taskId, recipient_id: userId, is_read: false },
      data: { is_read: true },
    });

    // Emit real-time read receipt to the chat room
    if (unreadMessages.length > 0) {
      const io = getIO();
      if (io) {
        io.to(`task_chat_${taskId}`).emit('messages_read', {
          taskId,
          readerId: userId,
          messageIds: unreadMessages.map((m) => m.id),
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
