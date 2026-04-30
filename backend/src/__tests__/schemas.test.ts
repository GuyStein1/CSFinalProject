import {
  authSyncSchema,
  createTaskSchema,
  createBidSchema,
  createReviewSchema,
  updateUserSchema,
  pushTokenSchema,
  createPortfolioItemSchema,
} from '../schemas';

// ── authSyncSchema ──────────────────────────────────────────────────────────
describe('authSyncSchema', () => {
  it('accepts valid input', () => {
    expect(() => authSyncSchema.parse({ full_name: 'Alice' })).not.toThrow();
  });

  test.each([
    [{ full_name: '' }, 'empty full_name'],
    [{ full_name: '  ' }, 'whitespace full_name'],
    [{}, 'missing full_name'],
  ])('rejects %s', (input, _label) => {
    expect(() => authSyncSchema.parse(input)).toThrow();
  });
});

// ── createTaskSchema ────────────────────────────────────────────────────────
describe('createTaskSchema', () => {
  const valid = {
    title: 'Fix my sink',
    description: 'Dripping tap under the kitchen sink.',
    category: 'PLUMBING',
    general_location_name: 'Tel Aviv',
    exact_address: '1 Dizengoff St',
    lat: 32.08,
    lng: 34.78,
  };

  it('accepts valid input', () => {
    expect(() => createTaskSchema.parse(valid)).not.toThrow();
  });

  test.each([
    [{ ...valid, title: '' }, 'empty title'],
    [{ ...valid, description: '' }, 'empty description'],
    [{ ...valid, category: 'INVALID' }, 'unknown category'],
    [{ ...valid, lat: 100 }, 'lat out of range'],
    [{ ...valid, lng: -200 }, 'lng out of range'],
    [{ ...valid, suggested_price: -10 }, 'negative price'],
  ])('rejects: %s', (input, _label) => {
    expect(() => createTaskSchema.parse(input)).toThrow();
  });
});

// ── createBidSchema ─────────────────────────────────────────────────────────
describe('createBidSchema', () => {
  it('accepts valid bid', () => {
    expect(() => createBidSchema.parse({ offered_price: 150, description: 'I can fix it.' })).not.toThrow();
  });

  test.each([
    [{ offered_price: 0, description: 'test' }, 'zero price'],
    [{ offered_price: -50, description: 'test' }, 'negative price'],
    [{ offered_price: 100, description: '' }, 'empty description'],
  ])('rejects: %s', (input, _label) => {
    expect(() => createBidSchema.parse(input)).toThrow();
  });
});

// ── createReviewSchema ──────────────────────────────────────────────────────
describe('createReviewSchema', () => {
  test.each([1, 2, 3, 4, 5])('accepts rating %i', (rating) => {
    expect(() => createReviewSchema.parse({ rating })).not.toThrow();
  });

  test.each([0, 6, -1])('rejects out-of-range rating %i', (rating) => {
    expect(() => createReviewSchema.parse({ rating })).toThrow();
  });
});

// ── updateUserSchema ────────────────────────────────────────────────────────
describe('updateUserSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(() => updateUserSchema.parse({})).not.toThrow();
  });

  it('accepts valid partial update', () => {
    expect(() => updateUserSchema.parse({ full_name: 'Bob', bio: 'Expert fixer' })).not.toThrow();
  });

  it('rejects invalid specialization', () => {
    expect(() => updateUserSchema.parse({ specializations: ['UNKNOWN'] })).toThrow();
  });
});

// ── pushTokenSchema ─────────────────────────────────────────────────────────
describe('pushTokenSchema', () => {
  it('accepts valid token', () => {
    expect(() => pushTokenSchema.parse({ token: 'ExponentPushToken[abc]' })).not.toThrow();
  });

  it('rejects empty token', () => {
    expect(() => pushTokenSchema.parse({ token: '' })).toThrow();
  });
});

// ── createPortfolioItemSchema ───────────────────────────────────────────────
describe('createPortfolioItemSchema', () => {
  it('accepts valid image_url', () => {
    expect(() => createPortfolioItemSchema.parse({ image_url: 'https://example.com/photo.jpg' })).not.toThrow();
  });

  it('rejects non-URL image_url', () => {
    expect(() => createPortfolioItemSchema.parse({ image_url: 'not-a-url' })).toThrow();
  });
});
