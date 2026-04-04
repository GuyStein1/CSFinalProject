import { Router, Request, Response, NextFunction } from 'express';
import { TaskStatus, Category, Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../config/prisma';
import { sendNotification } from '../services/notificationService';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../utils/errors';
import {
  createTaskSchema,
  updateTaskStatusSchema,
  createBidSchema,
  createReviewSchema,
} from '../schemas';

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

// POST /api/tasks — create a new task
router.post('/', validate(createTaskSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      media_urls,
      category,
      suggested_price,
      general_location_name,
      exact_address,
      lat,
      lng,
    } = req.body as {
      title: string;
      description: string;
      media_urls?: string[];
      category: Category;
      suggested_price?: number;
      general_location_name: string;
      exact_address: string;
      lat: number;
      lng: number;
    };

    // Insert with PostGIS point — must use raw SQL for the geometry column.
    // ST_MakePoint takes (longitude, latitude) — longitude first.
    const result = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Task" (
        id, requester_id, title, description, media_urls, category,
        suggested_price, status, general_location_name, exact_address,
        coordinates, is_payment_confirmed, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${req.user.id},
        ${title},
        ${description},
        ${media_urls ?? []}::text[],
        ${category}::"Category",
        ${suggested_price ?? null},
        'OPEN'::"TaskStatus",
        ${general_location_name},
        ${exact_address},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
        false,
        now(),
        now()
      )
      RETURNING id
    `;

    const task = await prisma.task.findUnique({
      where: { id: result[0].id },
      include: { requester: true },
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks — discovery feed for Fixers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      lat,
      lng,
      radius = '10',
      category,
      minPrice,
      maxPrice,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string | undefined>;

    if (!lat || !lng) {
      throw new ValidationError('lat and lng are required');
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius);
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;
    const radiusMeters = radiusNum * 1000;

    const minPriceNum = minPrice != null ? parseFloat(minPrice) : null;
    const maxPriceNum = maxPrice != null ? parseFloat(maxPrice) : null;

    // Cast to ::geography so ST_DWithin uses metres (not degrees).
    // Exclude coordinates column — it returns WKB hex which is useless to the client.
    // Tasks with suggested_price = NULL ("Quote Required") are always included.
    type TaskRow = {
      id: string;
      requester_id: string;
      title: string;
      description: string;
      media_urls: string[];
      category: Category;
      suggested_price: number | null;
      status: TaskStatus;
      general_location_name: string;
      is_payment_confirmed: boolean;
      created_at: Date;
      updated_at: Date;
      lat: number;
      lng: number;
      distance_km: number;
      bid_count: number;
    };

    let tasks: TaskRow[];
    let countResult: { count: bigint }[];

    if (minPriceNum !== null && maxPriceNum !== null) {
      tasks = await prisma.$queryRaw<TaskRow[]>`
        SELECT t.id, t.requester_id, t.title, t.description, t.media_urls, t.category,
               t.suggested_price, t.status, t.general_location_name,
               t.is_payment_confirmed, t.created_at, t.updated_at,
               ST_Y(t.coordinates::geometry) AS lat,
               ST_X(t.coordinates::geometry) AS lng,
               ROUND((
                 ST_Distance(
                   t.coordinates::geography,
                   ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography
                 ) / 1000
               )::numeric, 2)::double precision AS distance_km,
               COALESCE(bid_counts.bid_count, 0)::int AS bid_count
        FROM "Task" t
        LEFT JOIN (
          SELECT task_id, COUNT(*)::int AS bid_count
          FROM "Bid"
          WHERE status IN ('PENDING'::"BidStatus", 'ACCEPTED'::"BidStatus")
          GROUP BY task_id
        ) AS bid_counts
          ON bid_counts.task_id = t.id
        WHERE t.status = 'OPEN'::"TaskStatus"
          AND ST_DWithin(
            t.coordinates::geography,
            ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography,
            ${radiusMeters}
          )
          AND (t.suggested_price IS NULL OR (t.suggested_price >= ${minPriceNum} AND t.suggested_price <= ${maxPriceNum}))
          ${category ? Prisma.sql`AND t.category = ${category}::"Category"` : Prisma.empty}
        ORDER BY distance_km ASC, t.created_at DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `;
      countResult = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "Task"
        WHERE status = 'OPEN'::"TaskStatus"
          AND ST_DWithin(
            coordinates::geography,
            ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography,
            ${radiusMeters}
          )
          AND (suggested_price IS NULL OR (suggested_price >= ${minPriceNum} AND suggested_price <= ${maxPriceNum}))
          ${category ? Prisma.sql`AND category = ${category}::"Category"` : Prisma.empty}
      `;
    } else {
      tasks = await prisma.$queryRaw<TaskRow[]>`
        SELECT t.id, t.requester_id, t.title, t.description, t.media_urls, t.category,
               t.suggested_price, t.status, t.general_location_name,
               t.is_payment_confirmed, t.created_at, t.updated_at,
               ST_Y(t.coordinates::geometry) AS lat,
               ST_X(t.coordinates::geometry) AS lng,
               ROUND((
                 ST_Distance(
                   t.coordinates::geography,
                   ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography
                 ) / 1000
               )::numeric, 2)::double precision AS distance_km,
               COALESCE(bid_counts.bid_count, 0)::int AS bid_count
        FROM "Task" t
        LEFT JOIN (
          SELECT task_id, COUNT(*)::int AS bid_count
          FROM "Bid"
          WHERE status IN ('PENDING'::"BidStatus", 'ACCEPTED'::"BidStatus")
          GROUP BY task_id
        ) AS bid_counts
          ON bid_counts.task_id = t.id
        WHERE t.status = 'OPEN'::"TaskStatus"
          AND ST_DWithin(
            t.coordinates::geography,
            ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography,
            ${radiusMeters}
          )
          ${category ? Prisma.sql`AND t.category = ${category}::"Category"` : Prisma.empty}
        ORDER BY distance_km ASC, t.created_at DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `;
      countResult = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "Task"
        WHERE status = 'OPEN'::"TaskStatus"
          AND ST_DWithin(
            coordinates::geography,
            ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography,
            ${radiusMeters}
          )
          ${category ? Prisma.sql`AND category = ${category}::"Category"` : Prisma.empty}
      `;
    }

    const total = Number(countResult[0].count);
    res.json({ tasks, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id — task details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [task, bidCount] = await prisma.$transaction([
      prisma.task.findUnique({
        where: { id: req.params.id },
        include: { requester: true, fixer: true },
      }),
      prisma.bid.count({
        where: { task_id: req.params.id, status: { in: ['PENDING', 'ACCEPTED'] } },
      }),
    ]);

    if (!task) throw new NotFoundError('Task not found');

    const isRequester = req.user.id === task.requester_id;
    const isFixer = req.user.id === task.assigned_fixer_id;

    // Hide exact address from users who are neither the requester nor the assigned fixer
    const { exact_address: _exact, ...taskWithoutAddress } = task as typeof task & { exact_address: string };
    const response = isRequester || isFixer
      ? task
      : taskWithoutAddress;

    res.json({ task: { ...response, bid_count: bidCount } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id/status — update task status
router.put('/:id/status', validate(updateTaskStatusSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status: newStatus } = req.body as { status: TaskStatus };
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) throw new NotFoundError('Task not found');
    if (req.user.id !== task.requester_id) throw new ForbiddenError('Only the requester can update task status');

    const validTransitions: Partial<Record<TaskStatus, TaskStatus[]>> = {
      OPEN: ['CANCELED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELED'],
    };

    if (!validTransitions[task.status]?.includes(newStatus)) {
      throw new ValidationError(
        `Invalid status transition: ${task.status} → ${newStatus}`,
      );
    }

    if (task.status === 'OPEN' && newStatus === 'CANCELED') {
      // Reject all pending bids, then notify their owners
      const affectedBids = await prisma.bid.findMany({
        where: { task_id: task.id, status: 'PENDING' },
      });

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.task.update({
          where: { id: task.id },
          data: { status: 'CANCELED' },
        });
        await tx.bid.updateMany({
          where: { task_id: task.id, status: 'PENDING' },
          data: { status: 'REJECTED' },
        });
      });

      for (const bid of affectedBids) {
        await sendNotification(
          bid.fixer_id,
          'Task Canceled',
          'A task you bid on was canceled.',
          'TASK_CANCELED',
          task.id,
          'Task',
        );
      }
    } else if (task.status === 'IN_PROGRESS' && newStatus === 'COMPLETED') {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'COMPLETED', completed_at: new Date() },
      });

      if (task.assigned_fixer_id) {
        await sendNotification(
          task.assigned_fixer_id,
          'Task Completed',
          'The requester has marked the task as completed.',
          'TASK_COMPLETED',
          task.id,
          'Task',
        );
      }
    } else if (task.status === 'IN_PROGRESS' && newStatus === 'CANCELED') {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'CANCELED' },
      });

      if (task.assigned_fixer_id) {
        await sendNotification(
          task.assigned_fixer_id,
          'Task Canceled',
          'The requester has canceled the task.',
          'TASK_CANCELED',
          task.id,
          'Task',
        );
      }
    }

    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id/confirm-payment
router.put('/:id/confirm-payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) throw new NotFoundError('Task not found');
    if (req.user.id !== task.requester_id) throw new ForbiddenError('Only the requester can confirm payment');
    if (task.status !== 'COMPLETED') throw new ValidationError('Payment can only be confirmed on a completed task');

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { is_payment_confirmed: true },
    });

    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/bids — fixer submits a bid
router.post('/:id/bids', validate(createBidSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) throw new NotFoundError('Task not found');
    if (task.status !== 'OPEN') throw new ValidationError('Bids can only be submitted on open tasks');
    if (req.user.id === task.requester_id) throw new ForbiddenError('Requesters cannot bid on their own tasks');

    // Per API spec: return existing bid with has_existing_bid flag instead of 409
    const existing = await prisma.bid.findUnique({
      where: { task_id_fixer_id: { task_id: task.id, fixer_id: req.user.id } },
    });
    if (existing) {
      return res.status(200).json({ bid: existing, has_existing_bid: true });
    }

    // Enforce 15-bid cap (pending + accepted bids)
    const bidCount = await prisma.bid.count({
      where: { task_id: task.id, status: { in: ['PENDING', 'ACCEPTED'] } },
    });
    if (bidCount >= 15) throw new ConflictError('This task has reached the maximum number of bids');

    const { offered_price, description } = req.body as {
      offered_price: number;
      description: string;
    };

    const bid = await prisma.bid.create({
      data: {
        task_id: task.id,
        fixer_id: req.user.id,
        offered_price,
        description,
      },
    });

    await sendNotification(
      task.requester_id,
      'New Bid',
      'Someone submitted a bid on your task.',
      'NEW_BID',
      bid.id,
      'Bid',
    );

    res.status(201).json({ bid, has_existing_bid: false });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id/bids — requester views all bids for their task
router.get('/:id/bids', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) throw new NotFoundError('Task not found');
    if (req.user.id !== task.requester_id) throw new ForbiddenError('Only the requester can view bids');

    const bids = await prisma.bid.findMany({
      where: { task_id: task.id },
      include: { fixer: true },
      orderBy: { created_at: 'asc' },
    });

    res.json({ bids });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/reviews — requester submits a review for the fixer
router.post('/:id/reviews', validate(createReviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) throw new NotFoundError('Task not found');
    if (req.user.id !== task.requester_id) {
      throw new ForbiddenError('Only the task requester can submit a review');
    }
    if (task.status !== 'COMPLETED') {
      throw new ValidationError('Task must be completed before it can be reviewed');
    }
    if (!task.assigned_fixer_id) {
      throw new ValidationError('Task has no assigned fixer');
    }

    // Enforce 14-day review window
    if (task.completed_at) {
      const daysSinceCompleted = (Date.now() - task.completed_at.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCompleted > 14) {
        throw new ForbiddenError('Review window has expired (14 days after completion)');
      }
    }

    // Check for duplicate review
    const existing = await prisma.review.findUnique({
      where: {
        task_id_reviewer_id: {
          task_id: task.id,
          reviewer_id: req.user.id,
        },
      },
    });
    if (existing) {
      throw new ConflictError('A review already exists for this task');
    }

    const { rating, comment } = req.body as { rating: number; comment?: string };

    const review = await prisma.review.create({
      data: {
        task_id: task.id,
        reviewer_id: req.user.id,
        reviewee_id: task.assigned_fixer_id,
        rating,
        comment: comment ?? null,
      },
    });

    // Update fixer's average rating
    const { _avg } = await prisma.review.aggregate({
      where: { reviewee_id: task.assigned_fixer_id },
      _avg: { rating: true },
    });
    await prisma.user.update({
      where: { id: task.assigned_fixer_id },
      data: { average_rating_as_fixer: _avg.rating ?? 0 },
    });

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id — requester deletes a completed or canceled task
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new NotFoundError('Task not found');
    if (req.user.id !== task.requester_id) throw new ForbiddenError('Only the requester can delete this task');
    if (task.status !== 'COMPLETED' && task.status !== 'CANCELED') {
      throw new ValidationError('Only completed or canceled tasks can be deleted');
    }

    await prisma.$transaction([
      prisma.review.deleteMany({ where: { task_id: task.id } }),
      prisma.message.deleteMany({ where: { task_id: task.id } }),
      prisma.bid.deleteMany({ where: { task_id: task.id } }),
      prisma.notification.deleteMany({ where: { related_entity_id: task.id } }),
      prisma.task.delete({ where: { id: task.id } }),
    ]);

    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
