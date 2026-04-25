import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { ValidationError } from '../../utils/errors';

const schema = z.object({ name: z.string().min(1), age: z.number().int().min(0) });

function makeReq(body: unknown) {
  return { body } as Request;
}

describe('validate middleware', () => {
  it('calls next() with no error for valid body', () => {
    const req = makeReq({ name: 'Alice', age: 30 });
    const next = jest.fn();
    validate(schema)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(); // called with no args = success
  });

  it('calls next(ValidationError) for invalid body', () => {
    const req = makeReq({ name: '', age: -1 });
    const next = jest.fn() as NextFunction;
    validate(schema)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('calls next(ValidationError) for missing required fields', () => {
    const req = makeReq({});
    const next = jest.fn() as NextFunction;
    validate(schema)(req, {} as Response, next);
    const err = (next as jest.Mock).mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details).toBeDefined();
  });
});
