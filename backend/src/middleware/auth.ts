import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebaseAdmin';
import { prisma } from '../config/prisma';
import { UnauthorizedError, NotFoundError } from '../utils/errors';

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (firebaseErr) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { firebase_uid: decoded.uid },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
