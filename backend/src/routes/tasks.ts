import { Router, Request, Response, NextFunction } from 'express';
import { TaskStatus, Category, Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../config/prisma';
import { sendNotification } from '../services/notificationService';
import { recalculateFixerRating } from '../utils/ratingCalculator';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../utils/errors';
import { getIO } from '../socket';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  createBidSchema,
  createReviewSchema,
  completionPhotosSchema,
} from '../schemas';

const router = Router();

// Israel coastline approximation — minimum longitude per latitude band
const COASTLINE: [number, number][] = [
  [29.50, 34.94], [31.20, 34.56], [31.70, 34.62],
  [32.00, 34.75], [32.10, 34.77], [32.30, 34.84],
  [32.50, 34.87], [32.80, 34.96], [33.10, 35.08],
];

function isInSea(lat: number, lng: number): boolean {
  if (lat < COASTLINE[0][0] || lat > COASTLINE[COASTLINE.length - 1][0]) return false;
  for (let i = 0; i < COASTLINE.length - 1; i++) {
    const [lat0, lng0] = COASTLINE[i];
    const [lat1, lng1] = COASTLINE[i + 1];
    if (lat >= lat0 && lat <= lat1) {
      const t = (lat - lat0) / (lat1 - lat0);
      const minLng = lng0 + t * (lng1 - lng0);
      return lng < minLng;
    }
  }
  return false;
}

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
      urgency,
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
      urgency?: string;
      general_location_name: string;
      exact_address: string;
      lat: number;
      lng: number;
    };

    // Validate coordinates are on land (not in the sea)
    if (isInSea(lat, lng)) {
      throw new ValidationError('Location appears to be in the sea. Please pick a valid address on land.');
    }

    // Insert with PostGIS point — must use raw SQL for the geometry column.
    // ST_MakePoint takes (longitude, latitude) — longitude first.
    const result = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Task" (
        id, requester_id, title, description, media_urls, category,
        suggested_price, urgency, status, general_location_name, exact_address,
        coordinates, completion_photos, is_payment_confirmed, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${req.user.id},
        ${title},
        ${description},
        ${media_urls ?? []}::text[],
        ${category}::"Category",
        ${suggested_price ?? null},
        ${urgency ?? 'FLEXIBLE'}::"TaskUrgency",
        'OPEN'::"TaskStatus",
        ${general_location_name},
        ${exact_address},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
        '{}'::text[],
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
      urgency,
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
      urgency: string;
      bid_count: number;
    };

    let tasks: TaskRow[];
    let countResult: { count: bigint }[];

    if (minPriceNum !== null && maxPriceNum !== null) {
      tasks = await prisma.$queryRaw<TaskRow[]>`
        SELECT t.id, t.requester_id, t.title, t.description, t.media_urls, t.category,
               t.suggested_price, t.urgency, t.status, t.general_location_name,
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
          ${urgency ? Prisma.sql`AND t.urgency = ${urgency}::"TaskUrgency"` : Prisma.empty}
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
          ${urgency ? Prisma.sql`AND urgency = ${urgency}::"TaskUrgency"` : Prisma.empty}
      `;
    } else {
      tasks = await prisma.$queryRaw<TaskRow[]>`
        SELECT t.id, t.requester_id, t.title, t.description, t.media_urls, t.category,
               t.suggested_price, t.urgency, t.status, t.general_location_name,
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
          ${urgency ? Prisma.sql`AND t.urgency = ${urgency}::"TaskUrgency"` : Prisma.empty}
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
          ${urgency ? Prisma.sql`AND urgency = ${urgency}::"TaskUrgency"` : Prisma.empty}
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
    const [task, bidCount, myReview] = await prisma.$transaction([
      prisma.task.findUnique({
        where: { id: req.params.id },
        include: { requester: true, fixer: true },
      }),
      prisma.bid.count({
        where: { task_id: req.params.id, status: { in: ['PENDING', 'ACCEPTED'] } },
      }),
      prisma.review.findUnique({
        where: {
          task_id_reviewer_id: {
            task_id: req.params.id,
            reviewer_id: req.user.id,
          },
        },
      }),
    ]);

    if (!task) throw new NotFoundError('Task not found');

    // Extract lat/lng from PostGIS coordinates
    const coordsRow = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(coordinates::geometry) AS lat, ST_X(coordinates::geometry) AS lng
      FROM "Task" WHERE id = ${req.params.id}
    `;
    const coords = coordsRow[0] ?? { lat: null, lng: null };

    const isRequester = req.user.id === task.requester_id;
    const isFixer = req.user.id === task.assigned_fixer_id;

    // Hide exact address from users who are neither the requester nor the assigned fixer
    const { exact_address: _exact, ...taskWithoutAddress } = task as typeof task & { exact_address: string };
    const response = isRequester || isFixer
      ? task
      : taskWithoutAddress;

    res.json({
      task: {
        ...response,
        bid_count: bidCount,
        lat: coords.lat,
        lng: coords.lng,
        my_review: myReview,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id/directions?originLat=...&originLng=... — driving directions via Google
router.get('/:id/directions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { originLat, originLng } = req.query;
    if (!originLat || !originLng) throw new ValidationError('originLat and originLng are required');

    const coordsRow = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(coordinates::geometry) AS lat, ST_X(coordinates::geometry) AS lng
      FROM "Task" WHERE id = ${req.params.id}
    `;
    const dest = coordsRow[0];
    if (!dest) throw new NotFoundError('Task not found');

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
      res.json({ directions: null });
      return;
    }

    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${originLat},${originLng}` +
      `&destination=${dest.lat},${dest.lng}` +
      `&mode=driving` +
      `&departure_time=now` +
      `&language=he` +
      `&key=${apiKey}`;

    const gRes = await fetch(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await gRes.json();

    if (data.status !== 'OK' || !data.routes?.length) {
      res.json({ directions: null });
      return;
    }

    const leg = data.routes[0].legs[0];

    // Google returns English units even with language=he — localise to Hebrew
    const toHe = (text: string) =>
      text
        .replace(/\bkm\b/g, 'ק״מ')
        .replace(/\bm\b/g, 'מ׳')
        .replace(/\bmins?\b/g, 'דקות')
        .replace(/\bhours?\b/g, 'שעות')
        .replace(/\bdays?\b/g, 'ימים');

    res.json({
      directions: {
        distanceText: toHe(leg.distance.text),
        durationText: toHe(leg.duration.text),
        durationInTraffic: leg.duration_in_traffic?.text ? toHe(leg.duration_in_traffic.text) : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id — edit an OPEN task
router.put('/:id', validate(updateTaskSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new NotFoundError('Task not found');
    if (req.user.id !== task.requester_id) throw new ForbiddenError('Only the requester can edit this task');
    if (task.status !== 'OPEN') throw new ConflictError('Only OPEN tasks can be edited');

    const { title, description, category, suggested_price, general_location_name, exact_address } = req.body;

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(suggested_price !== undefined && { suggested_price }),
        ...(general_location_name !== undefined && { general_location_name }),
        ...(exact_address !== undefined && { exact_address }),
      },
    });

    res.json({ task: updated });
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

    // Reopening a CANCELED task is handled by the dedicated PUT /api/tasks/:id/reopen
    // endpoint (it also clears assigned_fixer_id), so it is intentionally not a
    // transition here.
    const validTransitions: Partial<Record<TaskStatus, TaskStatus[]>> = {
      OPEN: ['CANCELED'],
      IN_PROGRESS: ['CANCELED'],
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
          data: { status: 'REJECTED', rejection_reason: 'TASK_CANCELED' },
        });
      });

      for (const bid of affectedBids) {
        await sendNotification(
          bid.fixer_id,
          'Task Canceled',
          `The task "${task.title}" you bid on has been canceled.`,
          'TASK_CANCELED',
          task.id,
          'Task',
        );
      }
    } else if (task.status === 'IN_PROGRESS' && newStatus === 'CANCELED') {
      if (task.is_payment_confirmed) {
        throw new ValidationError('Cannot cancel a task after payment has been confirmed');
      }
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'CANCELED' },
      });

      if (task.assigned_fixer_id) {
        await sendNotification(
          task.assigned_fixer_id,
          'Task Canceled',
          `The task "${task.title}" has been canceled by the requester.`,
          'TASK_CANCELED',
          task.id,
          'Task',
        );
      }
    }

    // Notify open chat rooms about the status change
    const io = getIO();
    if (io) {
      io.to(`task_chat_${task.id}`).emit('task_status_changed', {
        taskId: task.id,
        status: 'CANCELED',
      });
    }

    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id/reopen — re-post a canceled task to the discovery feed
router.put('/:id/reopen', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) throw new NotFoundError('Task not found');
    if (req.user.id !== task.requester_id) throw new ForbiddenError('Only the requester can reopen this task');
    if (task.status !== 'CANCELED') throw new ValidationError('Only a canceled task can be reopened');

    // Reopen as a clean OPEN task: clear the assigned fixer and wipe the previous
    // engagement. The old bids and chat are void once a task is canceled, and clearing
    // them: (a) removes any stale ACCEPTED bid that would otherwise inflate bid_count
    // and leave an OPEN task in an illegal "has an accepted bid" state; (b) frees the
    // (task_id, fixer_id) unique constraint so prior bidders can bid again; and
    // (c) prevents a future fixer from reading the prior fixer's chat history, since
    // message access is granted to any bidder on the task (see messages.ts).
    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.bid.deleteMany({ where: { task_id: task.id } });
      await tx.message.deleteMany({ where: { task_id: task.id } });
      return tx.task.update({
        where: { id: task.id },
        data: { status: 'OPEN', assigned_fixer_id: null },
      });
    });

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
    if (task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED') {
      throw new ValidationError('Payment can only be confirmed on an in-progress or completed task');
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { is_payment_confirmed: true },
    });

    // Notify fixer that payment was confirmed
    if (task.assigned_fixer_id) {
      await sendNotification(
        task.assigned_fixer_id,
        'Payment Confirmed',
        `The requester confirmed payment for "${task.title}". You can now mark the task as completed.`,
        'TASK_COMPLETED',
        task.id,
        'Task',
      );
    }

    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id/confirm-completion — both sides must confirm after payment
router.put('/:id/confirm-completion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) throw new NotFoundError('Task not found');
    if (task.status !== 'IN_PROGRESS') throw new ValidationError('Task must be in progress');
    if (!task.is_payment_confirmed) throw new ValidationError('Payment must be confirmed before marking as completed');

    const isRequester = req.user.id === task.requester_id;
    const isFixer = req.user.id === task.assigned_fixer_id;
    if (!isRequester && !isFixer) throw new ForbiddenError('Only the requester or assigned fixer can confirm completion');

    // Use a transaction with re-check to prevent race conditions
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const freshTask = await tx.task.findUnique({ where: { id: task.id } });
      if (!freshTask || freshTask.status !== 'IN_PROGRESS') {
        throw new ConflictError('Task is no longer in progress');
      }
      if (isRequester && freshTask.requester_completed) {
        throw new ConflictError('You have already confirmed completion');
      }
      if (isFixer && freshTask.fixer_completed) {
        throw new ConflictError('You have already confirmed completion');
      }

      const updateData: Record<string, boolean | Date> = {};
      if (isRequester) updateData.requester_completed = true;
      if (isFixer) {
        updateData.fixer_completed = true;
        updateData.fixer_completed_at = new Date();
      }

      const newRequesterCompleted = isRequester ? true : freshTask.requester_completed;
      const newFixerCompleted = isFixer ? true : freshTask.fixer_completed;
      const bothCompleted = newRequesterCompleted && newFixerCompleted;

      if (bothCompleted) {
        await tx.task.update({
          where: { id: task.id },
          data: { ...updateData, status: 'COMPLETED', completed_at: new Date() },
        });
        if (freshTask.assigned_fixer_id) {
          await tx.user.update({
            where: { id: freshTask.assigned_fixer_id },
            data: { completed_tasks_as_fixer: { increment: 1 } },
          });
        }
        return 'COMPLETED' as const;
      } else {
        await tx.task.update({
          where: { id: task.id },
          data: updateData,
        });
        return 'PARTIAL' as const;
      }
    });

    if (result === 'COMPLETED') {
      // Notify both sides
      await sendNotification(
        task.requester_id,
        'Task Completed',
        `The task "${task.title}" has been marked as completed by both sides.`,
        'TASK_COMPLETED',
        task.id,
        'Task',
      );
      if (task.assigned_fixer_id) {
        await sendNotification(
          task.assigned_fixer_id,
          'Task Completed',
          `The task "${task.title}" has been marked as completed by both sides.`,
          'TASK_COMPLETED',
          task.id,
          'Task',
        );
      }
      // Review nudge — only if the requester hasn't already left a review
      const existingReview = await prisma.review.findUnique({
        where: { task_id_reviewer_id: { task_id: task.id, reviewer_id: task.requester_id } },
      });
      if (!existingReview) {
        const fixer = await prisma.user.findUnique({
          where: { id: task.assigned_fixer_id! },
          select: { full_name: true },
        });
        await sendNotification(
          task.requester_id,
          'Leave a Review',
          `Task "${task.title}" is complete! Let ${fixer?.full_name || 'the fixer'} know how they did.`,
          'TASK_COMPLETED',
          task.id,
          'Task',
        );
      }
    } else {
      // Notify the other side
      const otherUserId = isRequester ? task.assigned_fixer_id : task.requester_id;
      if (otherUserId) {
        await sendNotification(
          otherUserId,
          'Completion Confirmed',
          `One side has confirmed completion of "${task.title}". Please confirm on your end.`,
          'TASK_COMPLETED',
          task.id,
          'Task',
        );
      }
    }

    // Notify open chat rooms about the status change
    if (result === 'COMPLETED') {
      const io = getIO();
      if (io) {
        io.to(`task_chat_${task.id}`).emit('task_status_changed', {
          taskId: task.id,
          status: 'COMPLETED',
        });
      }
    }

    const updated = await prisma.task.findUnique({ where: { id: task.id } });
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

    // Update fixer's average response time (minutes from task creation to bid)
    const responseMinutes = (Date.now() - task.created_at.getTime()) / (1000 * 60);
    const fixer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avg_response_time_minutes: true, bids: { select: { id: true }, where: { id: { not: bid.id } } } },
    });
    if (fixer) {
      const previousBidCount = fixer.bids.length;
      const prevAvg = fixer.avg_response_time_minutes ?? 0;
      const newAvg = (prevAvg * previousBidCount + responseMinutes) / (previousBidCount + 1);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { avg_response_time_minutes: Math.round(newAvg * 100) / 100 },
      });
    }

    await sendNotification(
      task.requester_id,
      'New Bid',
      `You received a new bid of ₪${offered_price} on "${task.title}".`,
      'NEW_BID',
      task.id,
      'Task',
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

    // Repeat customer indicator: check if the requester has previously completed tasks with each fixer
    const previousTaskCounts = await prisma.task.groupBy({
      by: ['assigned_fixer_id'],
      where: {
        requester_id: req.user.id,
        status: 'COMPLETED',
        id: { not: task.id },
        assigned_fixer_id: { in: bids.map((b) => b.fixer_id) },
      },
      _count: true,
    });
    const repeatMap = new Map(
      previousTaskCounts.map((r) => [r.assigned_fixer_id, r._count]),
    );

    // Certification data for bidding fixers
    const fixerIds = bids.map((b) => b.fixer_id);
    const certifications = await prisma.certification.findMany({
      where: { fixer_id: { in: fixerIds }, status: 'APPROVED' },
      select: { fixer_id: true, category: true },
    });
    const certMap = new Map<string, string[]>();
    for (const cert of certifications) {
      const list = certMap.get(cert.fixer_id) ?? [];
      list.push(cert.category);
      certMap.set(cert.fixer_id, list);
    }

    const enrichedBids = bids.map((b) => ({
      ...b,
      is_repeat_customer: (repeatMap.get(b.fixer_id) ?? 0) > 0,
      previous_tasks_together: repeatMap.get(b.fixer_id) ?? 0,
      certified_categories: certMap.get(b.fixer_id) ?? [],
    }));

    res.json({ bids: enrichedBids });
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
    if (!task.completed_at) {
      throw new ValidationError('Task completion date is missing');
    }
    const daysSinceCompleted = (Date.now() - task.completed_at.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCompleted > 14) {
      throw new ForbiddenError('Review window has expired (14 days after completion)');
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

    // Recalculate fixer's weighted average rating
    await recalculateFixerRating(task.assigned_fixer_id);

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/completion-photos — fixer uploads completion photos
router.post('/:id/completion-photos', validate(completionPhotosSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw new NotFoundError('Task not found');
    if (req.user.id !== task.assigned_fixer_id) throw new ForbiddenError('Only the assigned fixer can upload completion photos');
    if (task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED') {
      throw new ValidationError('Completion photos can only be added to in-progress or completed tasks');
    }

    const { completion_photos } = req.body as { completion_photos: string[] };

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { completion_photos },
    });

    // Auto-add to fixer's portfolio
    const portfolioData = completion_photos.map((url) => ({
      fixer_id: req.user.id,
      image_url: url,
      description: `Completed: ${task.title}`,
    }));
    await prisma.portfolioItem.createMany({ data: portfolioData });

    res.json({ task: updated });
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
