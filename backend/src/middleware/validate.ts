import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        next(new ValidationError('Validation error', err.issues));
        return;
      }
      next(err);
    }
  };
}
