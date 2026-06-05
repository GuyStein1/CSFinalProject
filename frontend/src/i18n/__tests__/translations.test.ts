import en from '../en.json';
import he from '../he.json';

function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const full = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null
      ? leafKeys(v as Record<string, unknown>, full)
      : [full];
  });
}

function getLeaf(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, k) => (acc as Record<string, unknown>)[k], obj as unknown);
}

const enKeys = leafKeys(en as Record<string, unknown>);
const heKeys = new Set(leafKeys(he as Record<string, unknown>));

describe('translation key parity (en ↔ he)', () => {
  it('every en key exists in he', () => {
    const missing = enKeys.filter((k) => !heKeys.has(k));
    expect(missing).toEqual([]);
  });

  it('no extra keys in he that are absent from en', () => {
    const enSet = new Set(enKeys);
    const extra = [...heKeys].filter((k) => !enSet.has(k));
    expect(extra).toEqual([]);
  });

  it('interpolation variables in budgetRange match between en and he', () => {
    const vars = (s: string) =>
      [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    const enVal = getLeaf(en as Record<string, unknown>, 'discovery.filterBar.budgetRange') as string;
    const heVal = getLeaf(he as Record<string, unknown>, 'discovery.filterBar.budgetRange') as string;
    expect(vars(heVal)).toEqual(vars(enVal));
  });
});
