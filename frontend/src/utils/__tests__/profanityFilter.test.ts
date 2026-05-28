import { containsProfanity, PROFANITY_ERROR_MESSAGE } from '../profanityFilter';

describe('profanityFilter (frontend)', () => {
  it('detects English profanity', () => {
    expect(containsProfanity('this is shit')).toBe(true);
    expect(containsProfanity('What the fuck')).toBe(true);
  });

  it('detects Hebrew profanity', () => {
    expect(containsProfanity('זונה')).toBe(true);
    expect(containsProfanity('בןזונה')).toBe(true);
  });

  it('detects Hebrew profanity with spaces stripped', () => {
    expect(containsProfanity('בן זו נה')).toBe(true);
  });

  it('allows clean text', () => {
    expect(containsProfanity('Great job, very professional!')).toBe(false);
    expect(containsProfanity('עבודה מצוינת')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(containsProfanity('')).toBe(false);
  });

  it('exports a user-facing error message', () => {
    expect(typeof PROFANITY_ERROR_MESSAGE).toBe('string');
    expect(PROFANITY_ERROR_MESSAGE.length).toBeGreaterThan(0);
  });
});
