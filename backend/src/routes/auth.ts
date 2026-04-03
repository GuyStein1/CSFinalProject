import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import admin from '../config/firebaseAdmin';
import { prisma } from '../config/prisma';
import { UnauthorizedError, ConflictError } from '../utils/errors';

const router = Router();

// POST /api/auth/sync — create local User record after Firebase registration.
// Not protected by authMiddleware — the user doesn't exist in DB yet.
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const decoded = await admin.auth().verifyIdToken(token);

    const { full_name, phone_number } = req.body as {
      full_name: string;
      phone_number?: string;
    };

    const user = await prisma.user.create({
      data: {
        firebase_uid: decoded.uid,
        email: decoded.email ?? '',
        full_name,
        phone_number,
      },
    });

    res.status(201).json({ user });
  } catch (err) {
    if (
      err instanceof PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return next(new ConflictError('User already exists'));
    }
    next(err as Error);
  }
});

export default router;
