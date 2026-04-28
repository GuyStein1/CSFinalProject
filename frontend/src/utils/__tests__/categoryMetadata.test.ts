import {
  CATEGORY_LIST,
  CATEGORY_ORDER,
  getCategoryMeta,
} from '../categoryMetadata';

describe('categoryMetadata', () => {
  it('keeps the eight production categories in one ordered registry', () => {
    expect(CATEGORY_LIST).toHaveLength(8);
    expect(CATEGORY_LIST.map((category) => category.value)).toEqual(CATEGORY_ORDER);
  });

  it('uses production Material Community Icon names and fallback metadata', () => {
    expect(getCategoryMeta('PLUMBING')).toMatchObject({
      label: 'Plumbing',
      icon: 'water-pump',
    });
    expect(getCategoryMeta('UNKNOWN')).toMatchObject({
      label: 'Other',
      icon: 'wrench',
    });
  });
});
