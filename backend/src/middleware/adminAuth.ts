import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

/**
 * Middleware that requires the authenticated user to be an admin.
 * Must be used AFTER authMiddleware (req.user must already be set).
 */
export function adminOnly(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user.is_admin) {
    next(new ForbiddenError('Admin access required'));
    return;
  }
  next();
}
