import { Router, Request, Response, NextFunction } from 'express';
import { Sql } from '@prisma/client/runtime/library';
import { TaskStatus, Category, Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../config/prisma';
import { sendNotification } from '../services/notificationService';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors';

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

// POST /api/tasks — create a new task
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
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
    };

    let tasks: TaskRow[];
    let countResult: { count: bigint }[];

    if (minPriceNum !== null && maxPriceNum !== null) {
      tasks = await prisma.$queryRaw<TaskRow[]>`
        SELECT id, requester_id, title, description, media_urls, category,
               suggested_price, status, general_location_name,
               is_payment_confirmed, created_at, updated_at
        FROM "Task"
        WHERE status = 'OPEN'::"TaskStatus"
          AND ST_DWithin(
            coordinates::geography,
            ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography,
            ${radiusMeters}
          )
          AND (suggested_price IS NULL OR (suggested_price >= ${minPriceNum} AND suggested_price <= ${maxPriceNum}))
          ${category ? Sql`AND category = ${category}::"Category"` : Sql``}
        ORDER BY created_at DESC
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
          ${category ? Sql`AND category = ${category}::"Category"` : Sql``}
      `;
    } else {
      tasks = await prisma.$queryRaw<TaskRow[]>`
        SELECT id, requester_id, title, description, media_urls, category,
               suggested_price, status, general_location_name,
               is_payment_confirmed, created_at, updated_at
        FROM "Task"
        WHERE status = 'OPEN'::"TaskStatus"
          AND ST_DWithin(
            coordinates::geography,
            ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography,
            ${radiusMeters}
          )
          ${category ? Sql`AND category = ${category}::"Category"` : Sql``}
        ORDER BY created_at DESC
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
          ${category ? Sql`AND category = ${category}::"Category"` : Sql``}
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
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { requester: true, fixer: true },
    });

    if (!task) throw new NotFoundError('Task not found');

    const isRequester = req.user.id === task.requester_id;
    const isFixer = req.user.id === task.assigned_fixer_id;

    // Hide exact address from users who are neither the requester nor the assigned fixer
    const { exact_address: _exact, ...taskWithoutAddress } = task as typeof task & { exact_address: string };
    const response = isRequester || isFixer
      ? task
      : taskWithoutAddress;

    res.json({ task: response });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id/status — update task status
router.put('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
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

export default router;
