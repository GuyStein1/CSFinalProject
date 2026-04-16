import { Router, Request, Response, NextFunction } from 'express';
import { TaskStatus, BidStatus } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../config/prisma';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { updateUserSchema, pushTokenSchema, createPortfolioItemSchema } from '../schemas';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/users/me — current authenticated user profile
router.get('/me', (req: Request, res: Response) => {
  res.json({ user: req.user });
});

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
        include: {
          _count: { select: { bids: { where: { status: 'PENDING' } } } },
          fixer: { select: { full_name: true } },
          reviews: { where: { reviewer_id: req.user.id }, select: { id: true }, take: 1 },
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limitNum,
      }),
      prisma.task.count({ where }),
    ]);

    const enriched = tasks.map((t) => ({
      ...t,
      bid_count: t._count.bids,
      assigned_fixer_name: t.fixer?.full_name ?? null,
      has_review: t.reviews.length > 0,
      _count: undefined,
      fixer: undefined,
      reviews: undefined,
    }));

    res.json({ tasks: enriched, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/bids — fixer's submitted bids
router.get('/me/bids', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      page = '1',
      limit = '20',
    } = req.query as { status?: BidStatus; page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const where = {
      fixer_id: req.user.id,
      ...(status && { status }),
    };

    const [bids, total] = await prisma.$transaction([
      prisma.bid.findMany({
        where,
        include: { task: true },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limitNum,
      }),
      prisma.bid.count({ where }),
    ]);

    res.json({ bids, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me — update authenticated user profile
router.put('/me', validate(updateUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: req.body,
    });
    res.json({ user });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      return next(new ConflictError('Phone number is already in use'));
    }
    next(err);
  }
});

// POST /api/users/me/push-token — register or update Expo push token
router.post('/me/push-token', validate(pushTokenSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { push_token: req.body.token },
    });
    res.json({ message: 'Push token registered' });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/me/portfolio — add a portfolio item
router.post('/me/portfolio', validate(createPortfolioItemSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.portfolioItem.create({
      data: { fixer_id: req.user.id, ...req.body },
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me/portfolio/:id — remove a portfolio item
router.delete('/me/portfolio/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.portfolioItem.findUnique({ where: { id: req.params.id } });
    if (!item) throw new NotFoundError('Portfolio item not found');
    if (item.fixer_id !== req.user.id) throw new ForbiddenError('You do not own this portfolio item');
    await prisma.portfolioItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id — public profile (limited fields)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        full_name: true,
        avatar_url: true,
        average_rating_as_fixer: true,
        specializations: true,
        created_at: true,
      },
    });
    if (!user) throw new NotFoundError('User not found');
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id/reviews — get all reviews received by a user (as fixer)
router.get('/:id/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });
    if (!user) throw new NotFoundError('User not found');

    const {
      page = '1',
      limit = '20',
    } = req.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where: { reviewee_id: req.params.id },
        include: { reviewer: true, task: true },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limitNum,
      }),
      prisma.review.count({ where: { reviewee_id: req.params.id } }),
    ]);

    res.json({ reviews, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

export default router;
