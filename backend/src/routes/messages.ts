import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';

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
    if (!isMember) throw new ForbiddenError('Not a participant in this chat');

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { task_id: taskId },
        orderBy: { created_at: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: { select: { id: true, full_name: true, avatar_url: true } },
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
router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const tasks = await prisma.task.findMany({
      where: {
        OR: [{ requester_id: userId }, { assigned_fixer_id: userId }],
        messages: { some: {} },
      },
      include: {
        requester: { select: { id: true, full_name: true, avatar_url: true } },
        fixer: { select: { id: true, full_name: true, avatar_url: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { content: true, created_at: true, sender_id: true, is_read: true },
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
        const otherParty =
          task.requester_id === userId ? task.fixer : task.requester;
        const lastMessage = task.messages[0] ?? null;

        return {
          taskId: task.id,
          taskTitle: task.title,
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

export default router;
