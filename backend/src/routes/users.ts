import { Router, Request, Response, NextFunction } from 'express';
import { TaskStatus, BidStatus } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../config/prisma';
import { NotFoundError, ConflictError, ForbiddenError, UnauthorizedError } from '../utils/errors';
import admin from '../config/firebaseAdmin';
import { updateUserSchema, pushTokenSchema, createPortfolioItemSchema, submitVerificationSchema, submitCertificationSchema } from '../schemas';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/users/me — current authenticated user profile (includes portfolio_items)
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        portfolio_items: { orderBy: { created_at: 'desc' } },
        certifications: { orderBy: { created_at: 'desc' } },
      },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
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
          fixer: { select: { id: true, full_name: true, avatar_url: true } },
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
      assigned_fixer_id: t.fixer?.id ?? null,
      assigned_fixer_avatar: t.fixer?.avatar_url ?? null,
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
        include: {
          task: {
            include: {
              requester: {
                select: { id: true, full_name: true, avatar_url: true },
              },
            },
          },
        },
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

// PATCH /api/users/me/email-verified — mark email as verified (checks Firebase token)
router.patch('/me/email-verified', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Re-verify the Firebase token to get the latest emailVerified status
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }
    const token = authHeader.slice(7);
    const decoded = await admin.auth().verifyIdToken(token);

    if (!decoded.email_verified) {
      return res.status(403).json({ error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email is not yet verified in Firebase' } });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { email_verified: true },
    });
    res.json({ user });
  } catch (err) {
    next(err as Error);
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

// POST /api/users/me/verification — submit ID for verification
router.post('/me/verification', validate(submitVerificationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user?.verification_status === 'APPROVED') {
      return next(new ConflictError('Already verified'));
    }
    if (user?.verification_status === 'PENDING') {
      return next(new ConflictError('Verification already pending'));
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        verification_status: 'PENDING',
        verification_photo_url: req.body.verification_photo_url,
      },
    });
    res.json({ message: 'Verification submitted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/certifications — list own certifications
router.get('/me/certifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const certifications = await prisma.certification.findMany({
      where: { fixer_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });
    res.json({ certifications });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/me/certifications — submit a certification for review
router.post('/me/certifications', validate(submitCertificationSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, title, document_url } = req.body;

    // Verify the fixer has this category in their specializations
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.specializations.includes(category)) {
      return next(new ForbiddenError(`You must have ${category} in your specializations`));
    }

    // Check for existing certification for this category
    const existing = await prisma.certification.findUnique({
      where: { fixer_id_category: { fixer_id: req.user.id, category } },
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        return next(new ConflictError('Certification already pending review'));
      }
      if (existing.status === 'APPROVED') {
        return next(new ConflictError('You already have an approved certification for this category'));
      }
      // REJECTED — allow re-upload by updating existing record
      const updated = await prisma.certification.update({
        where: { id: existing.id },
        data: { title, document_url, status: 'PENDING', rejection_note: null, reviewed_at: null, reviewed_by: null },
      });
      return res.json({ certification: updated });
    }

    const certification = await prisma.certification.create({
      data: { fixer_id: req.user.id, category, title, document_url },
    });
    res.status(201).json({ certification });
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
        bio: true,
        average_rating_as_fixer: true,
        completed_tasks_as_fixer: true,
        avg_response_time_minutes: true,
        verification_status: true,
        specializations: true,
        created_at: true,
        portfolio_items: { orderBy: { created_at: 'desc' } },
        certifications: {
          where: { status: 'APPROVED' },
          select: { id: true, category: true, title: true, created_at: true },
        },
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

    const whereClause = { reviewee_id: req.params.id, is_hidden: false };

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where: whereClause,
        include: { reviewer: true, task: true },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limitNum,
      }),
      prisma.review.count({ where: whereClause }),
    ]);

    res.json({ reviews, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

export default router;
