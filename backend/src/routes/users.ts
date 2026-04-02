import { Router, Request, Response, NextFunction } from 'express';
import { TaskStatus } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/prisma';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/users/me/tasks — requester's own tasks
router.get('/me/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      page = '1',
      limit = '20',
    } = req.query as { status?: TaskStatus; page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const where = {
      requester_id: req.user.id,
      ...(status && { status }),
    };

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limitNum,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({ tasks, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/bids — implemented in PR 3 (bid endpoints)

export default router;
