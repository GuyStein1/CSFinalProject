import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminOnly } from '../middleware/adminAuth';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import { recalculateFixerRating } from '../utils/ratingCalculator';

const router = Router();

router.use(authMiddleware);
router.use(adminOnly);

// GET /api/admin/flagged-reviews — list all flagged reviews with reports
router.get(
  '/flagged-reviews',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const reviews = await prisma.review.findMany({
        where: { is_flagged: true, is_hidden: false },
        include: {
          reviewer: { select: { id: true, full_name: true, email: true } },
          reviewee: { select: { id: true, full_name: true, email: true } },
          task: { select: { id: true, title: true } },
          reports: {
            include: {
              reporter: { select: { id: true, full_name: true } },
            },
            orderBy: { created_at: 'desc' },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      res.json({ reviews });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/admin/reviews/:id/hide — hide a review (remove from public view)
router.post(
  '/reviews/:id/hide',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const review = await prisma.review.findUnique({
        where: { id: req.params.id },
      });
      if (!review) throw new NotFoundError('Review not found');

      await prisma.review.update({
        where: { id: review.id },
        data: { is_hidden: true },
      });

      // Recalculate fixer's weighted average rating
      await recalculateFixerRating(review.reviewee_id);

      res.json({ message: 'Review hidden successfully' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/admin/reviews/:id/dismiss — dismiss reports, clear flagged status
router.post(
  '/reviews/:id/dismiss',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const review = await prisma.review.findUnique({
        where: { id: req.params.id },
      });
      if (!review) throw new NotFoundError('Review not found');

      await prisma.$transaction([
        prisma.reviewReport.deleteMany({
          where: { review_id: review.id },
        }),
        prisma.review.update({
          where: { id: review.id },
          data: { is_flagged: false },
        }),
      ]);

      res.json({ message: 'Reports dismissed successfully' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
