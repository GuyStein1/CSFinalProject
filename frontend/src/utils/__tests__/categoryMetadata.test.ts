import {
  CATEGORY_LIST,
  CATEGORY_ORDER,
  getCategoryMeta,
  getCategoryLabel,
} from '../categoryMetadata';

describe('categoryMetadata', () => {
  it('keeps all production categories in one ordered registry', () => {
    expect(CATEGORY_LIST).toHaveLength(9);
    expect(CATEGORY_LIST.map((category) => category.value)).toEqual(CATEGORY_ORDER);
  });

  it('uses production Material Community Icon names and fallback metadata', () => {
    expect(getCategoryMeta('PLUMBING')).toMatchObject({
      label: 'Plumbing',
      icon: 'water-pump',
      commonTasks: expect.arrayContaining(['leaky tap', 'clogged sink']),
      starterPrompt: expect.stringContaining('leak'),
    });
    expect(getCategoryMeta('UNKNOWN')).toMatchObject({
      label: 'Other',
      icon: 'wrench',
      detailCopy: expect.any(String),
    });
  });

  it('provides rich browse copy for every production category', () => {
    CATEGORY_LIST.forEach((category) => {
      expect(category.detailCopy.length).toBeGreaterThan(24);
      expect(category.commonTasks.length).toBeGreaterThanOrEqual(3);
      expect(category.starterPrompt.length).toBeGreaterThan(24);
    });
  });
});

describe('getCategoryLabel', () => {
  const mockT = (key: string) => key;

  it('constructs the i18n key from a known category', () => {
    expect(getCategoryLabel('PLUMBING', mockT)).toBe('categories.plumbing');
    expect(getCategoryLabel('ASSEMBLY', mockT)).toBe('categories.assembly');
  });

  it('lowercases the category value to build the key', () => {
    expect(getCategoryLabel('ELECTRICITY', mockT)).toBe('categories.electricity');
    expect(getCategoryLabel('CLEANING', mockT)).toBe('categories.cleaning');
  });

  it('calls t() with the exact constructed key', () => {
    const spy = jest.fn((key: string) => `TRANSLATED:${key}`);
    expect(getCategoryLabel('PAINTING', spy)).toBe('TRANSLATED:categories.painting');
    expect(spy).toHaveBeenCalledWith('categories.painting');
  });

  it('covers every production category in CATEGORY_LIST', () => {
    CATEGORY_LIST.forEach(({ value }) => {
      expect(getCategoryLabel(value, mockT)).toBe(`categories.${value.toLowerCase()}`);
    });
  });
});
