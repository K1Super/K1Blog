import { beforeEach, describe, expect, it } from 'vitest';

import { AppError } from '@/lib/errors/app-error';
import { rawDb } from '@/lib/db/client-core';
import { DEFAULT_MODERATION_POLICY } from '@/features/comments/automation';
import {
  deleteComment,
  listAdminComments,
  moderateComment,
} from '@/features/comments/admin-service';
import { loadModerationPolicy, saveModerationPolicy } from '@/features/comments/policy-service';
import { createComment, listPublicComments } from '@/features/comments/service';

const postSlug = 'precision-as-aesthetic';

function meta(key: string) {
  return { ip: '127.0.0.1', userAgent: 'vitest-agent/1.0', idempotencyKey: key };
}

function input(overrides: Partial<Parameters<typeof createComment>[1]> = {}) {
  return {
    authorName: '测试读者',
    content: '一条用于集成测试的评论。',
    website: '',
    formStartedAt: Date.now() - 5000,
    ...overrides,
  };
}

function auditsFor(commentId: string) {
  return rawDb
    .prepare(
      'select action, actor_id, from_status, to_status from moderation_audit where comment_id = ?',
    )
    .all(commentId) as Array<{
    action: string;
    actor_id: string;
    from_status: string | null;
    to_status: string | null;
  }>;
}

describe('comments service', () => {
  beforeEach(() => {
    rawDb.exec(
      'delete from comment; delete from moderation_audit; delete from moderation_policy_revision;',
    );
  });

  it('auto-publishes low-risk comments immediately', () => {
    const created = createComment(postSlug, input(), meta('it-key-0001'));
    expect(created.status).toBe('approved');
    expect(listPublicComments(postSlug).items).toHaveLength(1);
    expect(listPublicComments(postSlug).items[0]?.authorName).toBe('测试读者');

    const moderation = rawDb
      .prepare('select action, score, policy_revision from comment_moderation where comment_id = ?')
      .get(created.id) as { action: string; score: number; policy_revision: number };
    expect(moderation).toMatchObject({ action: 'approved', score: 0, policy_revision: 0 });

    const audits = auditsFor(created.id);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: 'approve', actor_id: 'system:automation' });
  });

  it('returns the same result for a repeated idempotency key', () => {
    const first = createComment(postSlug, input(), meta('it-key-0002'));
    const second = createComment(postSlug, input(), meta('it-key-0002'));
    expect(second.id).toBe(first.id);
    expect(second.status).toBe(first.status);
  });

  it('holds risky comments for review and exposes the verdict to the admin ledger', () => {
    const created = createComment(
      postSlug,
      input({ content: '加微信领取资料，欢迎咨询。' }),
      meta('it-key-0003'),
    );
    expect(created.status).toBe('pending');
    expect(listPublicComments(postSlug).items).toHaveLength(0);

    const pending = listAdminComments('pending', 1, 20);
    expect(pending.total).toBe(1);
    expect(pending.items[0]?.automation?.action).toBe('pending');
    expect(pending.items[0]?.automation?.score).toBeGreaterThan(0);
    expect(
      pending.items[0]?.automation?.reasons.some((reason) => reason.code === 'banned_keyword'),
    ).toBe(true);

    moderateComment(created.id, 'approved', 'admin-test');
    expect(listPublicComments(postSlug).items).toHaveLength(1);
    expect(auditsFor(created.id)).toHaveLength(1);
    expect(auditsFor(created.id)[0]?.actor_id).toBe('admin-test');
  });

  it('marks honeypot submissions as spam without exposing them', () => {
    const created = createComment(postSlug, input({ website: 'bot' }), meta('it-key-0004'));
    expect(created.status).toBe('spam');
    expect(listPublicComments(postSlug).items).toHaveLength(0);
    expect(listAdminComments('spam', 1, 20).total).toBe(1);
  });

  it('supports one level of replies and hides deleted comments', () => {
    const parent = createComment(postSlug, input(), meta('it-key-0005'));
    expect(parent.status).toBe('approved');

    const reply = createComment(
      postSlug,
      input({ content: '一条回复。', parentId: parent.id }),
      meta('it-key-0006'),
    );
    expect(reply.status).toBe('approved');

    const items = listPublicComments(postSlug).items;
    expect(items).toHaveLength(2);
    expect(items.find((item) => item.parentId === parent.id)?.content).toBe('一条回复。');

    deleteComment(parent.id, 'admin-test');
    expect(listPublicComments(postSlug).items).toHaveLength(0);
  });

  it('rejects invalid parents', () => {
    expect(() =>
      createComment(
        postSlug,
        input({ parentId: '00000000-0000-4000-8000-000000000000' }),
        meta('it-key-0007'),
      ),
    ).toThrow(AppError);
  });

  it('saves a policy revision and re-evaluates pending comments in one transaction', () => {
    const created = createComment(
      postSlug,
      input({ content: '加微信领取资料，欢迎咨询。' }),
      meta('it-key-0008'),
    );
    expect(created.status).toBe('pending');

    const saved = saveModerationPolicy(
      {
        ...DEFAULT_MODERATION_POLICY,
        autoApproveMaxRisk: 60,
        autoBlockMinRisk: 80,
      },
      'admin-test',
    );

    expect(saved.snapshot.revision).toBe(1);
    expect(saved.sweep).toMatchObject({ processed: 1, approved: 1, skipped: 0 });

    const row = rawDb.prepare('select status from comment where id = ?').get(created.id) as {
      status: string;
    };
    expect(row.status).toBe('approved');
    expect(loadModerationPolicy().revision).toBe(1);

    const audits = auditsFor(created.id);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      action: 'approve',
      actor_id: 'system:automation',
      from_status: 'pending',
    });

    const moderation = rawDb
      .prepare('select action, policy_revision from comment_moderation where comment_id = ?')
      .get(created.id) as { action: string; policy_revision: number };
    expect(moderation).toMatchObject({ action: 'approved', policy_revision: 1 });
  });
});
