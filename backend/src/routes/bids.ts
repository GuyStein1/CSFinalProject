import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rejectBidSchema } from '../schemas';
import { prisma } from '../config/prisma';
import { sendNotification } from '../services/notificationService';
import { getNotificationText } from '../utils/notificationMessages';
import { getIO } from '../socket';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
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

    // Look up winning fixer's rating for auto-rejection context
    const winningFixer = await prisma.user.findUnique({
      where: { id: bid.fixer_id },
      select: { average_rating_as_fixer: true },
    });

    // Run DB changes atomically — re-check task status inside the transaction
    // to prevent a double-accept race condition.
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const freshTask = await tx.task.findUnique({ where: { id: bid.task_id } });
      if (!freshTask || freshTask.status !== 'OPEN') {
        throw new ConflictError('Task is no longer open — another bid may have been accepted');
      }

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
        data: {
          status: 'REJECTED',
          rejection_reason: 'CHOSE_ANOTHER',
          auto_rejected_winning_price: bid.offered_price,
          auto_rejected_winning_rating: winningFixer?.average_rating_as_fixer ?? null,
        },
      });
    });

    // Notify accepted fixer
    const acceptedText = await getNotificationText(bid.fixer_id, 'bidAccepted', { price: String(bid.offered_price), taskTitle: bid.task.title });
    await sendNotification(bid.fixer_id, acceptedText.title, acceptedText.body, 'BID_ACCEPTED', bid.task_id, 'Task', 'fixer');

    // Notify auto-rejected fixers
    const autoRejected = await prisma.bid.findMany({
      where: { task_id: bid.task_id, status: 'REJECTED', id: { not: bid.id } },
      select: { fixer_id: true },
    });
    for (const rejected of autoRejected) {
      const rejText = await getNotificationText(rejected.fixer_id, 'bidRejectedChosen', { taskTitle: bid.task.title });
      await sendNotification(rejected.fixer_id, rejText.title, rejText.body, 'BID_REJECTED', bid.task_id, 'Task', 'fixer');
    }

    const updated = await prisma.bid.findUnique({ where: { id: bid.id } });
    res.json({ bid: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bids/:id/reject — requester rejects a bid
router.put('/:id/reject', validate(rejectBidSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await prisma.bid.findUnique({
      where: { id: req.params.id },
      include: { task: true },
    });

    if (!bid) throw new NotFoundError('Bid not found');
    if (req.user.id !== bid.task.requester_id) throw new ForbiddenError('Only the requester can reject a bid');
    if (bid.status !== 'PENDING') throw new ValidationError('Only pending bids can be rejected');

    const { rejection_reason, rejection_note } = req.body;

    const updated = await prisma.bid.update({
      where: { id: bid.id },
      data: {
        status: 'REJECTED',
        rejection_reason,
        rejection_note: rejection_note ?? null,
      },
    });

    const rejNotif = await getNotificationText(bid.fixer_id, 'bidRejected', { price: String(bid.offered_price), taskTitle: bid.task.title });
    await sendNotification(bid.fixer_id, rejNotif.title, rejNotif.body, 'BID_REJECTED', bid.task_id, 'Task', 'fixer');

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
      include: { task: true },
    });

    if (!bid) throw new NotFoundError('Bid not found');
    if (req.user.id !== bid.fixer_id) throw new ForbiddenError('Only the fixer can withdraw their bid');
    if (bid.status !== 'PENDING') throw new ValidationError('Only pending bids can be withdrawn');

    const updated = await prisma.bid.update({
      where: { id: bid.id },
      data: { status: 'WITHDRAWN' },
    });

    const wdNotif = await getNotificationText(bid.task.requester_id, 'bidWithdrawn', { price: String(bid.offered_price), taskTitle: bid.task.title });
    await sendNotification(bid.task.requester_id, wdNotif.title, wdNotif.body, 'BID_WITHDRAWN', bid.task_id, 'Task', 'requester');

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

    const cancelNotif = await getNotificationText(bid.task.requester_id, 'fixerCanceled', { taskTitle: bid.task.title });
    await sendNotification(bid.task.requester_id, cancelNotif.title, cancelNotif.body, 'BID_WITHDRAWN', bid.task_id, 'Task', 'requester');

    // Notify open chat rooms so the chat updates in real-time
    const io = getIO();
    if (io) {
      io.to(`task_chat_${bid.task_id}`).emit('task_status_changed', {
        taskId: bid.task_id,
        status: 'OPEN',
      });
    }

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
