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

// PUT /api/bids/:id/cancel-accepted — fixer cancels an accepted bid, task goes back to OPEN
router.put('/:id/cancel-accepted', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id },
      include: { task: true },
    });

    if (!bid) throw new NotFoundError('Bid not found');
    if (req.user.id !== bid.fixer_id) throw new ForbiddenError('Only the fixer can cancel their accepted bid');
    if (bid.status !== 'ACCEPTED') throw new ValidationError('Only accepted bids can be canceled');
    if (bid.task.status !== 'IN_PROGRESS') throw new ValidationError('Task is not in progress');

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.bid.update({
        where: { id: bid.id },
        data: { status: 'WITHDRAWN' },
      });
      await tx.task.update({
        where: { id: bid.task_id },
        data: { status: 'OPEN', assigned_fixer_id: null },
      });
    });

    res.json({ message: 'Bid canceled, task reopened' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bids/:id/reactivate — fixer reactivates a withdrawn bid
router.put('/:id/reactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id },
      include: { task: true },
    });

    if (!bid) throw new NotFoundError('Bid not found');
    if (req.user.id !== bid.fixer_id) throw new ForbiddenError('Only the fixer can reactivate their bid');
    if (bid.status !== 'WITHDRAWN') throw new ValidationError('Only withdrawn bids can be reactivated');
    if (bid.task.status !== 'OPEN') throw new ValidationError('Task is no longer open');

    const updated = await prisma.bid.update({
      where: { id: bid.id },
      data: { status: 'PENDING' },
    });

    res.json({ bid: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bids/:id — fixer edits their pending bid (price and/or description)
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id },
    });

    if (!bid) throw new NotFoundError('Bid not found');
    if (req.user.id !== bid.fixer_id) throw new ForbiddenError('Only the fixer can edit their bid');
    if (bid.status !== 'PENDING') throw new ValidationError('Only pending bids can be edited');

    const { offered_price, description } = req.body;
    const data: { offered_price?: number; description?: string } = {};
    if (offered_price !== undefined) {
      if (typeof offered_price !== 'number' || offered_price <= 0) {
        throw new ValidationError('offered_price must be a positive number');
      }
      data.offered_price = offered_price;
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length === 0) {
        throw new ValidationError('description must be a non-empty string');
      }
      data.description = description.trim();
    }

    if (Object.keys(data).length === 0) {
      throw new ValidationError('Nothing to update');
    }

    const updated = await prisma.bid.update({
      where: { id: bid.id },
      data,
    });

    res.json({ bid: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bids/:id — fixer deletes a rejected or withdrawn bid
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await prisma.bid.findUnique({ where: { id: req.params.id } });
    if (!bid) throw new NotFoundError('Bid not found');
    if (req.user.id !== bid.fixer_id) throw new ForbiddenError('Only the fixer can delete their bid');
    if (bid.status !== 'REJECTED' && bid.status !== 'WITHDRAWN') {
      throw new ValidationError('Only rejected or withdrawn bids can be deleted');
    }
    await prisma.bid.delete({ where: { id: bid.id } });
    res.json({ message: 'Bid deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
