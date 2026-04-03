import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { sendNotification } from '../services/notificationService';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors';

const router = Router();

router.use(authMiddleware);

// PUT /api/bids/:id/accept — requester accepts a bid
router.put('/:id/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id },
      include: { task: true },
    });

    if (!bid) throw new NotFoundError('Bid not found');
    if (req.user.id !== bid.task.requester_id) throw new ForbiddenError('Only the requester can accept a bid');
    if (bid.status !== 'PENDING') throw new ValidationError('Only pending bids can be accepted');

    // Run DB changes atomically — all tx calls must use tx. not prisma.
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.task.update({
        where: { id: bid.task_id },
        data: { status: 'IN_PROGRESS', assigned_fixer_id: bid.fixer_id },
      });
      await tx.bid.update({
        where: { id: bid.id },
        data: { status: 'ACCEPTED' },
      });
      await tx.bid.updateMany({
        where: { task_id: bid.task_id, status: 'PENDING', id: { not: bid.id } },
        data: { status: 'REJECTED' },
      });
    });

    // Notify outside transaction — failure here should not roll back acceptance
    await sendNotification(
      bid.fixer_id,
      'Bid Accepted',
      'Your bid has been accepted!',
      'BID_ACCEPTED',
      bid.id,
      'Bid',
    );

    const updated = await prisma.bid.findUnique({ where: { id: bid.id } });
    res.json({ bid: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bids/:id/reject — requester rejects a bid
router.put('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id },
      include: { task: true },
    });

    if (!bid) throw new NotFoundError('Bid not found');
    if (req.user.id !== bid.task.requester_id) throw new ForbiddenError('Only the requester can reject a bid');
    if (bid.status !== 'PENDING') throw new ValidationError('Only pending bids can be rejected');

    const updated = await prisma.bid.update({
      where: { id: bid.id },
      data: { status: 'REJECTED' },
    });

    await sendNotification(
      bid.fixer_id,
      'Bid Rejected',
      'Your bid was not accepted.',
      'BID_REJECTED',
      bid.id,
      'Bid',
    );

    res.json({ bid: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bids/:id/withdraw — fixer withdraws their own bid
router.put('/:id/withdraw', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id },
    });

    if (!bid) throw new NotFoundError('Bid not found');
    if (req.user.id !== bid.fixer_id) throw new ForbiddenError('Only the fixer can withdraw their bid');
    if (bid.status !== 'PENDING') throw new ValidationError('Only pending bids can be withdrawn');

    const updated = await prisma.bid.update({
      where: { id: bid.id },
      data: { status: 'WITHDRAWN' },
    });

    // BID_WITHDRAWN does not exist in the NotificationType enum — skipping notification.
    // Flagged in plan: needs to be added to the schema or confirmed as intentional omission.

    res.json({ bid: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
