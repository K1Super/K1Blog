import { and, count, desc, eq, gte, isNull, or } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

import { db } from '@/lib/db/client-core';
import { comment, commentModeration, moderationAudit } from '@/lib/db/schema';
import { AppError } from '@/lib/errors/app-error';
import { moderationReasonsSchema, type ModerationReason } from './automation';
import type { AdminCommentDto, CommentStatus } from './schema';

export type ModerationMetrics = {
  total: number;
  pending: number;
  approved: number;
  autoApproved24h: number;
  autoBlocked24h: number;
};

function parseReasons(value: string | null): ModerationReason[] {
  if (!value) return [];
  try {
    const parsed = moderationReasonsSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function listAdminComments(
  status: CommentStatus | 'all',
  page: number,
  pageSize: number,
): { items: AdminCommentDto[]; total: number; page: number; pageSize: number } {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const conditions =
    status === 'all'
      ? [isNull(comment.deletedAt)]
      : [isNull(comment.deletedAt), eq(comment.status, status)];

  const totalRow = db
    .select({ value: count() })
    .from(comment)
    .where(and(...conditions))
    .get();

  const rows = db
    .select({
      id: comment.id,
      parentId: comment.parentId,
      authorName: comment.authorName,
      content: comment.content,
      createdAt: comment.createdAt,
      postSlug: comment.postSlug,
      status: comment.status,
      moderatedAt: comment.moderatedAt,
      moderatedBy: comment.moderatedBy,
      moderationNote: comment.moderationNote,
      automationAction: commentModeration.action,
      automationScore: commentModeration.score,
      automationReasons: commentModeration.reasons,
      automationPolicyRevision: commentModeration.policyRevision,
      automationEvaluatedAt: commentModeration.evaluatedAt,
    })
    .from(comment)
    .leftJoin(commentModeration, eq(comment.id, commentModeration.commentId))
    .where(and(...conditions))
    .orderBy(desc(comment.createdAt), desc(comment.id))
    .limit(safePageSize)
    .offset((safePage - 1) * safePageSize)
    .all();

  return {
    total: totalRow?.value ?? 0,
    page: safePage,
    pageSize: safePageSize,
    items: rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      authorName: row.authorName,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      postSlug: row.postSlug,
      status: row.status,
      moderatedAt: row.moderatedAt?.toISOString() ?? null,
      moderatedBy: row.moderatedBy,
      moderationNote: row.moderationNote,
      automation:
        row.automationAction && row.automationEvaluatedAt
          ? {
              action: row.automationAction,
              score: row.automationScore ?? 0,
              reasons: parseReasons(row.automationReasons),
              policyRevision: row.automationPolicyRevision ?? 0,
              evaluatedAt: row.automationEvaluatedAt.toISOString(),
            }
          : null,
    })),
  };
}

export function getModerationMetrics(): ModerationMetrics {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const total =
    db.select({ value: count() }).from(comment).where(isNull(comment.deletedAt)).get()?.value ?? 0;
  const pending =
    db
      .select({ value: count() })
      .from(comment)
      .where(and(eq(comment.status, 'pending'), isNull(comment.deletedAt)))
      .get()?.value ?? 0;
  const approved =
    db
      .select({ value: count() })
      .from(comment)
      .where(and(eq(comment.status, 'approved'), isNull(comment.deletedAt)))
      .get()?.value ?? 0;
  const autoApproved24h =
    db
      .select({ value: count() })
      .from(commentModeration)
      .where(
        and(eq(commentModeration.action, 'approved'), gte(commentModeration.evaluatedAt, since)),
      )
      .get()?.value ?? 0;
  const autoBlocked24h =
    db
      .select({ value: count() })
      .from(commentModeration)
      .where(
        and(
          or(eq(commentModeration.action, 'rejected'), eq(commentModeration.action, 'spam')),
          gte(commentModeration.evaluatedAt, since),
        ),
      )
      .get()?.value ?? 0;

  return { total, pending, approved, autoApproved24h, autoBlocked24h };
}

export function moderateComment(
  id: string,
  nextStatus: 'approved' | 'rejected' | 'spam',
  actorId: string,
  note?: string,
): { id: string; status: CommentStatus } {
  const current = db.select().from(comment).where(eq(comment.id, id)).get();
  if (!current || current.deletedAt !== null) throw new AppError('K1-CMT-002');

  if (current.status === nextStatus) {
    return { id: current.id, status: current.status };
  }

  const now = new Date();
  const action =
    nextStatus === 'approved' ? 'approve' : nextStatus === 'rejected' ? 'reject' : 'spam';

  db.transaction((tx) => {
    const result = tx
      .update(comment)
      .set({
        status: nextStatus,
        updatedAt: now,
        moderatedAt: now,
        moderatedBy: actorId,
        moderationNote: note ?? null,
      })
      .where(and(eq(comment.id, id), eq(comment.status, current.status), isNull(comment.deletedAt)))
      .run();

    if (result.changes === 0) throw new AppError('K1-ADM-001');

    tx.insert(moderationAudit)
      .values({
        id: uuidv7(),
        actorId,
        action,
        commentId: id,
        fromStatus: current.status,
        toStatus: nextStatus,
        note: note ?? null,
        createdAt: now,
      })
      .run();
  });

  return { id, status: nextStatus };
}

export function deleteComment(id: string, actorId: string): void {
  const current = db.select().from(comment).where(eq(comment.id, id)).get();
  if (!current || current.deletedAt !== null) throw new AppError('K1-CMT-002');

  const now = new Date();
  db.transaction((tx) => {
    const result = tx
      .update(comment)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(comment.id, id), isNull(comment.deletedAt)))
      .run();
    if (result.changes === 0) throw new AppError('K1-CMT-002');

    tx.insert(moderationAudit)
      .values({
        id: uuidv7(),
        actorId,
        action: 'delete',
        commentId: id,
        fromStatus: current.status,
        toStatus: null,
        note: null,
        createdAt: now,
      })
      .run();
  });
}
