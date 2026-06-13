import en from '../en.json';
import he from '../he.json';
import * as fs from 'fs';
import * as path from 'path';

// ── helpers ──

function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const full = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null
      ? leafKeys(v as Record<string, unknown>, full)
      : [full];
  });
}

function leafEntries(obj: Record<string, unknown>, prefix = ''): [string, string][] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const full = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null
      ? leafEntries(v as Record<string, unknown>, full)
      : [[full, v as string]];
  });
}

function getLeaf(obj: Record<string, unknown>, p: string): unknown {
  return p.split('.').reduce((acc, k) => (acc as Record<string, unknown>)[k], obj as unknown);
}

const enKeys = leafKeys(en as Record<string, unknown>);
const heKeys = new Set(leafKeys(he as Record<string, unknown>));
const enEntries = leafEntries(en as Record<string, unknown>);
const heEntries = leafEntries(he as Record<string, unknown>);

// ── 1. Key parity ──

describe('translation key parity (en ↔ he)', () => {
  it('every en key exists in he', () => {
    const missing = enKeys.filter((k) => !heKeys.has(k));
    expect(missing).toEqual([]);
  });

  it('no extra keys in he that are absent from en', () => {
    const enSet = new Set(enKeys);
    // Hebrew CLDR plural rules include _two and _many which English doesn't use
    const isHebrewPluralKey = (k: string) => k.endsWith('_two') || k.endsWith('_many');
    const extra = [...heKeys].filter((k) => !enSet.has(k) && !isHebrewPluralKey(k));
    expect(extra).toEqual([]);
  });
});

// ── 2. Interpolation variables match ──

describe('interpolation variables match between en and he', () => {
  const vars = (s: string) =>
    [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

  const enEntriesMap = new Map(enEntries);

  // Hebrew _one plural forms often omit {{count}} (e.g. "פעם אחת" vs "{{count}} time")
  // so we skip _one keys from this check
  it.each(
    enEntries
      .filter(([k, v]) => /\{\{\w+\}\}/.test(v) && !k.endsWith('_one'))
      .map(([k]) => k),
  )('%s has matching interpolation vars in he', (key) => {
    const enVal = enEntriesMap.get(key) as string;
    const heVal = getLeaf(he as Record<string, unknown>, key) as string | undefined;
    if (!heVal) return; // missing key caught by parity test
    expect(vars(heVal)).toEqual(vars(enVal));
  });
});

// ── 3. Hebrew file must not contain English-only values ──

describe('he.json values are actually in Hebrew', () => {
  const hebrewCharRegex = /[\u0590-\u05FF]/;
  // Brand names / technical terms that are OK to leave in English
  const allowedEnglishPatterns = [
    /FixIt/i, /Firebase/i, /Bit/i, /Paybox/i, /Google/i,
    /EN\s*\|/, /SMS/, /ID/, /OK/,
  ];
  // Keys where English content is expected (e.g. language toggle)
  const exemptKeys = new Set([
    'landing.language.toggle',
  ]);

  const heOnlyLeaves = heEntries.filter(
    ([key, val]) =>
      typeof val === 'string' &&
      val.length > 2 &&
      !exemptKeys.has(key) &&
      !hebrewCharRegex.test(val) &&
      !allowedEnglishPatterns.some((p) => p.test(val)) &&
      !/^\{\{/.test(val) && // pure interpolation like "{{count}}"
      !/^[₪€$\d\s.,:;!?+\-–—·★⁦⁩\u200F\u200E<>/()#%@&='"\\]+$/.test(val), // pure symbols/numbers
  );

  it('all he.json values contain Hebrew characters (no untranslated English)', () => {
    if (heOnlyLeaves.length > 0) {
      const report = heOnlyLeaves.map(([k, v]) => `  ${k}: "${v}"`).join('\n');
      throw new Error(`Found ${heOnlyLeaves.length} untranslated values in he.json:\n${report}`);
    }
  });
});

// ── 4. en.json must not contain Hebrew characters ──

describe('en.json values must not contain Hebrew', () => {
  const hebrewCharRegex = /[\u0590-\u05FF]/;
  // language toggle is exempt
  const exemptKeys = new Set(['landing.language.toggle']);

  const enWithHebrew = enEntries.filter(
    ([key, val]) =>
      typeof val === 'string' &&
      !exemptKeys.has(key) &&
      hebrewCharRegex.test(val),
  );

  it('no Hebrew characters in en.json values', () => {
    if (enWithHebrew.length > 0) {
      const report = enWithHebrew.map(([k, v]) => `  ${k}: "${v}"`).join('\n');
      throw new Error(`Found ${enWithHebrew.length} values with Hebrew in en.json:\n${report}`);
    }
  });
});

// ── 5. No hardcoded English UI strings in screen/component files ──

describe('no hardcoded English strings in UI code', () => {
  const srcRoot = path.resolve(__dirname, '../..');
  const screenDir = path.join(srcRoot, 'screens');
  const componentDir = path.join(srcRoot, 'components');

  function getTsxFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'));
  }

  const allFiles = [
    ...getTsxFiles(screenDir).map((f) => path.join(screenDir, f)),
    ...getTsxFiles(componentDir).map((f) => path.join(componentDir, f)),
  ];

  // Pattern: Alert.alert('Error', ...) with hardcoded English 'Error' title
  it('no Alert.alert with hardcoded English "Error" title', () => {
    const issues: string[] = [];
    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/Alert\.alert\(\s*['"]Error['"]/i.test(line)) {
          issues.push(`${path.basename(filePath)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(issues).toEqual([]);
  });

  // Pattern: confirm('Are you sure...') with hardcoded English
  it('no confirm() with hardcoded English strings', () => {
    const issues: string[] = [];
    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Match confirm('...English text...') but not confirm(t(...))
        if (/confirm\(\s*['"][A-Z]/.test(line)) {
          issues.push(`${path.basename(filePath)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(issues).toEqual([]);
  });

  // Pattern: window.alert('...English...') with hardcoded text
  it('no window.alert with hardcoded English strings', () => {
    const issues: string[] = [];
    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/window\.alert\(\s*['"][A-Z]/.test(line)) {
          issues.push(`${path.basename(filePath)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(issues).toEqual([]);
  });
});

// ── 6. Screens that display numbers with decimals must handle RTL ──

describe('decimal numbers in UI have writingDirection handling', () => {
  const srcRoot = path.resolve(__dirname, '../..');

  // Files that display .toFixed() results should have writingDirection on the Text
  it('toFixed() in JSX is paired with writingDirection or RTL handling', () => {
    const screenDir = path.join(srcRoot, 'screens');
    const componentDir = path.join(srcRoot, 'components');
    const issues: string[] = [];

    function checkDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, i) => {
          // Look for .toFixed( inside JSX Text elements (not in state setters or variables)
          if (/\{.*\.toFixed\(/.test(line) && !line.trim().startsWith('//') && !/(set\w+|const |let |var |=\s)/.test(line.trim())) {
            // Check surrounding ~5 lines for writingDirection or dir="ltr"
            const context = lines.slice(Math.max(0, i - 5), i + 5).join('\n');
            if (
              !context.includes('writingDirection') &&
              !context.includes('dir="ltr"') &&
              !context.includes('isRTL')
            ) {
              issues.push(`${file}:${i + 1}: .toFixed() without RTL direction handling`);
            }
          }
        });
      }
    }

    checkDir(screenDir);
    checkDir(componentDir);
    expect(issues).toEqual([]);
  });
});

// ── 7. No bilingual hardcoded strings ──

describe('no bilingual hardcoded strings', () => {
  const srcRoot = path.resolve(__dirname, '../..');
  const hebrewCharRegex = /[\u0590-\u05FF]/;
  const latinLetterRegex = /[a-zA-Z]{3,}/; // at least 3 consecutive latin letters

  it('no string literals mixing Hebrew and English in source code', () => {
    const issues: string[] = [];
    const dirs = [path.join(srcRoot, 'screens'), path.join(srcRoot, 'components'), path.join(srcRoot, 'utils')];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir).filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('.test.'))) {
        // profanityFilter has a legacy bilingual constant (unused in UI, kept for backwards compat)
        if (file === 'profanityFilter.ts') continue;
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, i) => {
          // Find string literals (single or double quoted, or template)
          const stringMatches = line.match(/['"`][^'"`]{5,}['"`]/g);
          if (!stringMatches) return;
          for (const str of stringMatches) {
            const inner = str.slice(1, -1);
            if (hebrewCharRegex.test(inner) && latinLetterRegex.test(inner)) {
              // Exclude brand names, imports, comments, URLs
              if (/FixIt|Firebase|Bit|Paybox|Google|http|import|require|console\.|eslint|\.tsx?|\.js/.test(inner)) continue;
              // Exclude format strings with interpolation
              if (/\$\{|%[sd]/.test(inner)) continue;
              issues.push(`${file}:${i + 1}: mixed Hebrew+English string: "${inner.substring(0, 60)}..."`);
            }
          }
        });
      }
    }
    expect(issues).toEqual([]);
  });
});
