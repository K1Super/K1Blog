import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODERATION_POLICY,
  evaluateComment,
  moderationPolicySchema,
} from '@/features/comments/automation';

function input(overrides: Partial<Parameters<typeof evaluateComment>[0]> = {}) {
  return {
    authorName: '读者',
    content: '一条正常的留言，讨论文章里的内容。',
    website: '',
    elapsedMs: 5000,
    priorIpComments: 1,
    priorDuplicateComments: 0,
    ...overrides,
  };
}

describe('comment automation', () => {
  it('approves a normal comment without risk signals', () => {
    const verdict = evaluateComment(input(), DEFAULT_MODERATION_POLICY);
    expect(verdict.action).toBe('approved');
    expect(verdict.score).toBe(0);
    expect(verdict.reasons).toHaveLength(0);
  });

  it('blocks honeypot submissions regardless of thresholds', () => {
    const verdict = evaluateComment(
      input({ website: 'https://spam.example' }),
      DEFAULT_MODERATION_POLICY,
    );
    expect(verdict.action).toBe('spam');
    expect(verdict.score).toBe(100);
    expect(verdict.reasons[0]?.code).toBe('honeypot');
  });

  it('holds banned keywords and fast submissions for review', () => {
    const keyword = evaluateComment(
      input({ content: '加微信领取资料，欢迎咨询。' }),
      DEFAULT_MODERATION_POLICY,
    );
    expect(keyword.action).toBe('pending');
    expect(keyword.reasons.some((reason) => reason.code === 'banned_keyword')).toBe(true);

    const fast = evaluateComment(input({ elapsedMs: 200 }), DEFAULT_MODERATION_POLICY);
    expect(fast.action).toBe('pending');
    expect(fast.reasons.some((reason) => reason.code === 'submit_too_fast')).toBe(true);
  });

  it('combines duplicate and source frequency signals into a block', () => {
    const verdict = evaluateComment(
      input({ priorDuplicateComments: 4, priorIpComments: 12 }),
      DEFAULT_MODERATION_POLICY,
    );
    expect(verdict.action).toBe('spam');
    expect(verdict.score).toBeGreaterThanOrEqual(70);
  });

  it('keeps comments pending when automation is disabled', () => {
    const verdict = evaluateComment(input(), {
      ...DEFAULT_MODERATION_POLICY,
      enabled: false,
    });
    expect(verdict.action).toBe('pending');
    expect(verdict.score).toBe(0);
  });

  it('validates policy bounds and normalizes list fields', () => {
    expect(
      moderationPolicySchema.safeParse({
        ...DEFAULT_MODERATION_POLICY,
        autoApproveMaxRisk: 70,
        autoBlockMinRisk: 60,
      }).success,
    ).toBe(false);

    const parsed = moderationPolicySchema.safeParse({
      ...DEFAULT_MODERATION_POLICY,
      bannedKeywords: [' 刷单 ', '刷单', '加微信'],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.bannedKeywords).toEqual(['刷单', '加微信']);
    }
  });

  it('accepts 1000 word list entries and rejects 1001', () => {
    const entries = Array.from({ length: 1000 }, (_, index) => `词${index}`);
    expect(
      moderationPolicySchema.safeParse({
        ...DEFAULT_MODERATION_POLICY,
        bannedKeywords: entries,
      }).success,
    ).toBe(true);

    expect(
      moderationPolicySchema.safeParse({
        ...DEFAULT_MODERATION_POLICY,
        bannedKeywords: [...entries, '额外词'],
      }).success,
    ).toBe(false);
  });
});
