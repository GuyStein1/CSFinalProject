import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
} from '../../utils/errors';

describe('AppError subclasses', () => {
  test.each([
    [UnauthorizedError, 401, 'UNAUTHORIZED'],
    [ForbiddenError, 403, 'FORBIDDEN'],
    [NotFoundError, 404, 'NOT_FOUND'],
    [ConflictError, 409, 'CONFLICT'],
    [ValidationError, 400, 'VALIDATION_ERROR'],
    [InternalError, 500, 'INTERNAL_ERROR'],
  ] as const)('%s has correct httpStatus and code', (ErrorClass, expectedStatus, expectedCode) => {
    const err = new (ErrorClass as new (msg: string) => AppError)('test message');
    expect(err.httpStatus).toBe(expectedStatus);
    expect(err.code).toBe(expectedCode);
    expect(err.message).toBe('test message');
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('preserves optional details', () => {
    const details = { field: 'email', issue: 'invalid' };
    const err = new ValidationError('bad input', details);
    expect(err.details).toEqual(details);
  });

  it('sets the constructor name as err.name', () => {
    expect(new NotFoundError('x').name).toBe('NotFoundError');
    expect(new ConflictError('x').name).toBe('ConflictError');
  });
});
