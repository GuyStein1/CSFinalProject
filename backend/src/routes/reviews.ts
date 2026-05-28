import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../config/prisma';
import { reportReviewSchema } from '../schemas';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors';

const router = Router();

router.use(authMiddleware);

// POST /api/reviews/:id/report — report an inappropriate review
router.post(
  '/:id/report',
  validate(reportReviewSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const review = await prisma.review.findUnique({
        where: { id: req.params.id },
      });

      if (!review) throw new NotFoundError('Review not found');

      if (req.user.id !== review.reviewee_id) {
        throw new ForbiddenError('Only the reviewed fixer can report a review');
      }

      const { reason, details } = req.body as {
        reason: string;
        details?: string;
      };

      try {
        const report = await prisma.reviewReport.create({
          data: {
            review_id: review.id,
            reporter_id: req.user.id,
            reason: reason as Prisma.ReviewReportCreateInput['reason'],
            details: details ?? null,
          },
        });

        // Flag the review for admin attention
        await prisma.review.update({
          where: { id: review.id },
          data: { is_flagged: true },
        });

        res.status(201).json({ report });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictError('You have already reported this review');
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  },
);

export default router;
