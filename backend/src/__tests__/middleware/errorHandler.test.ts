import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../middleware/errorHandler';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../utils/errors';

function makeMocks() {
  const req = {} as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('errorHandler middleware', () => {
  test.each([
    [new UnauthorizedError('not authed'), 401, 'UNAUTHORIZED'],
    [new ForbiddenError('forbidden'), 403, 'FORBIDDEN'],
    [new NotFoundError('missing'), 404, 'NOT_FOUND'],
    [new ConflictError('duplicate'), 409, 'CONFLICT'],
    [new ValidationError('bad body'), 400, 'VALIDATION_ERROR'],
  ])('maps %s to correct HTTP status', (err, expectedStatus, expectedCode) => {
    const { req, res, next } = makeMocks();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(expectedStatus);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: expectedCode }) }),
    );
  });

  it('returns 500 for unknown errors', () => {
    const { req, res, next } = makeMocks();
    errorHandler(new Error('boom'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'INTERNAL_ERROR' }) }),
    );
  });
});
