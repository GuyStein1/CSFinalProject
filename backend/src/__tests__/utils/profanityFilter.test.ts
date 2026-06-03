import { containsProfanity, PROFANITY_ERROR_MESSAGE } from '../../utils/profanityFilter';

describe('profanityFilter', () => {
  it('detects English profanity', () => {
    expect(containsProfanity('this is shit')).toBe(true);
    expect(containsProfanity('What the fuck')).toBe(true);
  });

  it('detects Hebrew profanity', () => {
    expect(containsProfanity('זונה')).toBe(true);
    expect(containsProfanity('בןזונה')).toBe(true);
  });

  it('detects Hebrew profanity with inserted spaces', () => {
    expect(containsProfanity('בן זו נה')).toBe(true);
    expect(containsProfanity('זו  נ  ה')).toBe(true);
  });

  it('allows clean text in English', () => {
    expect(containsProfanity('Great job, very professional!')).toBe(false);
  });

  it('allows clean text in Hebrew', () => {
    expect(containsProfanity('עבודה מצוינת, מקצועי מאוד')).toBe(false);
  });

  it('returns false for empty or undefined-ish input', () => {
    expect(containsProfanity('')).toBe(false);
  });

  it('exports a user-facing error message', () => {
    expect(PROFANITY_ERROR_MESSAGE).toBeDefined();
    expect(typeof PROFANITY_ERROR_MESSAGE).toBe('string');
  });
});
