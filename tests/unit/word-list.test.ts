import { describe, expect, it } from 'vitest';

import {
  WORD_LIST_MAX,
  mergeWordList,
  parseWordListFile,
  splitWordList,
} from '@/features/comments/word-list';

describe('word list import', () => {
  it('parses TXT with lines and Chinese separators, deduplicating case-insensitively', () => {
    const result = parseWordListFile('words.txt', `博彩、赌场\nCasino\ncasino\n${'a'.repeat(41)}`);

    expect(result.terms).toEqual(['博彩', '赌场', 'Casino']);
    expect(result.duplicates).toBe(1);
    expect(result.invalid).toBe(1);
    expect(result.error).toBeUndefined();
  });

  it('parses CSV first column and supports quoted commas and optional headers', () => {
    const result = parseWordListFile('words.csv', 'term,note\n"刷单, 加微信",备注\n博彩,x\n');

    expect(result.terms).toEqual(['刷单, 加微信', '博彩']);
    expect(result.total).toBe(2);
    expect(result.invalid).toBe(0);
  });

  it('rejects malformed CSV and files without valid terms', () => {
    expect(parseWordListFile('words.csv', 'term\n"未闭合').error).toContain('CSV');
    expect(parseWordListFile('words.txt', '、\n、').error).toBe('文件中没有有效词项');
  });

  it('rejects an import that exceeds the word list limit', () => {
    const body = Array.from({ length: WORD_LIST_MAX + 1 }, (_, index) => `词${index}`).join('\n');
    const result = parseWordListFile('words.txt', body);
    expect(result.error).toContain(`${WORD_LIST_MAX}`);
  });

  it('merges by append or replace without case-only duplicates', () => {
    const appended = mergeWordList(['博彩', '赌场'], ['赌场', 'Casino'], 'append');
    expect(appended.terms).toEqual(['博彩', '赌场', 'Casino']);
    expect(appended.duplicates).toBe(1);
    expect(appended.overflow).toBe(false);

    const replaced = mergeWordList(['博彩', '赌场'], ['赌场', 'Casino'], 'replace');
    expect(replaced.terms).toEqual(['赌场', 'Casino']);
  });

  it('flags append overflow at the limit', () => {
    const current = Array.from({ length: WORD_LIST_MAX }, (_, index) => `词${index}`);
    const merged = mergeWordList(current, ['额外词'], 'append');
    expect(merged.overflow).toBe(true);
  });

  it('splits textarea values only on line breaks and Chinese separators', () => {
    expect(splitWordList('博彩、赌场\ncasino, viagra')).toEqual(['博彩', '赌场', 'casino, viagra']);
  });
});
