import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { adminOnly } from '../middleware/adminAuth';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import { recalculateFixerRating } from '../utils/ratingCalculator';
import { sendNotification } from '../services/notificationService';
import { getNotificationText } from '../utils/notificationMessages';
import { validate } from '../middleware/validate';
import { reviewCertificationSchema } from '../schemas';

const router = Router();

router.use(authMiddleware);
router.use(adminOnly);

// GET /api/admin/flagged-reviews — list all flagged reviews with reports
router.get(
  '/flagged-reviews',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
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
          skip,
          take: limit,
        }),
        prisma.review.count({ where: { is_flagged: true, is_hidden: false } }),
      ]);

      res.json({ reviews, total, page, limit });
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

// GET /api/admin/pending-verifications — list fixers awaiting verification
router.get(
  '/pending-verifications',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: { verification_status: 'PENDING' },
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true,
            verification_photo_url: true,
            created_at: true,
          },
          orderBy: { updated_at: 'asc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where: { verification_status: 'PENDING' } }),
      ]);
      res.json({ users, total, page, limit });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/admin/users/:id/verify — approve or reject verification
router.post(
  '/users/:id/verify',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action } = req.body as { action?: string };
      if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ error: { message: 'action must be "approve" or "reject"' } });
      }

      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) throw new NotFoundError('User not found');

      const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
      await prisma.user.update({
        where: { id: user.id },
        data: { verification_status: status },
      });

      // Notify the fixer
      await prisma.notification.create({
        data: {
          user_id: user.id,
          title: action === 'approve' ? 'Verification approved!' : 'Verification rejected',
          body: action === 'approve'
            ? 'Your identity has been verified. A badge will now appear on your profile.'
            : 'Your verification was not approved. You can resubmit with a clearer photo.',
          type: action === 'approve' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
          related_entity_id: user.id,
          related_entity_type: 'user',
        },
      });

      res.json({ message: `Verification ${action}d` });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/download-photo?url=... — proxy download for verification photos
router.get(
  '/download-photo',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = req.query.url as string;
      if (!url || !url.startsWith('https://firebasestorage.googleapis.com/')) {
        return res.status(400).json({ error: { message: 'Invalid URL' } });
      }

      const response = await fetch(url);
      if (!response.ok) return res.status(502).json({ error: { message: 'Failed to fetch photo' } });

      res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="verification-photo.jpg"');

      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/pending-certifications — list certifications awaiting review
router.get(
  '/pending-certifications',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const skip = (page - 1) * limit;

      const [certifications, total] = await Promise.all([
        prisma.certification.findMany({
          where: { status: 'PENDING' },
          include: {
            fixer: {
              select: {
                id: true,
                full_name: true,
                email: true,
                avatar_url: true,
                specializations: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
          skip,
          take: limit,
        }),
        prisma.certification.count({ where: { status: 'PENDING' } }),
      ]);
      res.json({ certifications, total, page, limit });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/admin/certifications/:id/review — approve or reject a certification
router.post(
  '/certifications/:id/review',
  validate(reviewCertificationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action, rejection_note } = req.body as { action: 'approve' | 'reject'; rejection_note?: string };

      const certification = await prisma.certification.findUnique({ where: { id: req.params.id } });
      if (!certification) throw new NotFoundError('Certification not found');

      const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
      await prisma.certification.update({
        where: { id: certification.id },
        data: {
          status,
          reviewed_at: new Date(),
          reviewed_by: req.user.id,
          ...(action === 'reject' && rejection_note ? { rejection_note } : {}),
        },
      });

      const categoryLabel = certification.category.charAt(0) + certification.category.slice(1).toLowerCase();
      const notifType = action === 'approve' ? 'CERTIFICATION_APPROVED' : 'CERTIFICATION_REJECTED';
      const key = action === 'approve' ? 'certificationApproved' : 'certificationRejected';
      const certNt = await getNotificationText(certification.fixer_id, key as 'certificationApproved' | 'certificationRejected', { category: categoryLabel, reason: rejection_note || '' });
      await sendNotification(certification.fixer_id, certNt.title, certNt.body, notifType, certification.id, 'certification', 'fixer');

      res.json({ message: `Certification ${action}d` });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
