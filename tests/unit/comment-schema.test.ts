import { describe, expect, it } from 'vitest';

import { commentInputSchema, moderationInputSchema } from '@/features/comments/schema';

describe('comment schemas', () => {
  it('accepts a valid comment', () => {
    const result = commentInputSchema.safeParse({
      authorName: '读者',
      content: '一条评论',
      website: '',
      formStartedAt: Date.now(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty and oversized content', () => {
    expect(
      commentInputSchema.safeParse({
        authorName: '读者',
        content: '   ',
        formStartedAt: Date.now(),
      }).success,
    ).toBe(false);
    expect(
      commentInputSchema.safeParse({
        authorName: '读者',
        content: 'a'.repeat(2001),
        formStartedAt: Date.now(),
      }).success,
    ).toBe(false);
  });

  it('rejects empty names and invalid parent ids', () => {
    expect(
      commentInputSchema.safeParse({
        authorName: '   ',
        content: '评论',
        formStartedAt: Date.now(),
      }).success,
    ).toBe(false);
    expect(
      commentInputSchema.safeParse({
        authorName: '读者',
        content: '评论',
        parentId: 'not-a-uuid',
        formStartedAt: Date.now(),
      }).success,
    ).toBe(false);
  });

  it('validates moderation input', () => {
    expect(moderationInputSchema.safeParse({ status: 'approved' }).success).toBe(true);
    expect(moderationInputSchema.safeParse({ status: 'pending' }).success).toBe(false);
  });
});
