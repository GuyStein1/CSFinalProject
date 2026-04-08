import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

router.use(authMiddleware);

// GET /api/notifications — fetch user's notifications
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '20',
    } = req.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { user_id: req.user.id },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limitNum,
      }),
      prisma.notification.count({ where: { user_id: req.user.id } }),
    ]);

    res.json({ notifications, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all — mark all notifications as read
// Must be defined BEFORE /:id/read so Express doesn't match "read-all" as :id
router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { user_id: req.user.id, is_read: false },
      data: { is_read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read — mark single notification as read
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) throw new NotFoundError('Notification not found');
    if (notification.user_id !== req.user.id) {
      throw new ForbiddenError('Cannot mark another user\'s notification as read');
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { is_read: true },
    });

    res.json({ notification: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications — delete all notifications for current user
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.deleteMany({
      where: { user_id: req.user.id },
    });
    res.json({ message: 'All notifications deleted' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id — delete a single notification
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) throw new NotFoundError('Notification not found');
    if (notification.user_id !== req.user.id) {
      throw new ForbiddenError('Cannot delete another user\'s notification');
    }

    await prisma.notification.delete({ where: { id: notification.id } });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
