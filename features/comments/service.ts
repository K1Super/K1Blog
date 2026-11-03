import { and, asc, eq, gt, inArray, isNull, or } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

import { db } from '@/lib/db/client-core';
import { comment } from '@/lib/db/schema';
import { AppError } from '@/lib/errors/app-error';
import { getPostBySlug } from '@/features/content/loader';
import { hashIdempotencyKey, hashIp } from '@/lib/security/crypto';
import type { CommentDto, CommentInput, CommentStatus } from './schema';
import { evaluateCommentCandidate } from './automation-context';
import {
  AUTOMATION_ACTOR,
  autoNote,
  loadModerationPolicy,
  writeAutomationRecord,
} from './policy-service';

type RequestMeta = {
  ip: string;
  userAgent: string | null;
  idempotencyKey: string;
};

type Cursor = { createdAt: number; id: string };

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.getTime()}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(value: string): Cursor {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const [createdAtPart, id] = decoded.split('|');
    const createdAt = Number(createdAtPart);
    if (!id || !Number.isFinite(createdAt) || createdAt <= 0) throw new Error('bad cursor');
    return { createdAt, id };
  } catch {
    throw new AppError('K1-REQ-002', { message: '分页游标格式错误' });
  }
}

function toDto(row: {
  id: string;
  parentId: string | null;
  authorName: string;
  content: string;
  createdAt: Date;
}): CommentDto {
  return {
    id: row.id,
    parentId: row.parentId,
    authorName: row.authorName,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

const MESSAGE_TARGET = 'about';

function assertCommentTarget(slug: string) {
  if (slug === MESSAGE_TARGET) return;
  const post = getPostBySlug(slug);
  if (!post) throw new AppError('K1-CMT-001');
  return post;
}

export function listPublicComments(
  postSlug: string,
  options: { cursor?: string; limit?: number } = {},
): { items: CommentDto[]; nextCursor: string | null } {
  assertCommentTarget(postSlug);
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const cursor = options.cursor ? decodeCursor(options.cursor) : null;

  const conditions = [
    eq(comment.postSlug, postSlug),
    eq(comment.status, 'approved'),
    isNull(comment.parentId),
    isNull(comment.deletedAt),
  ];

  if (cursor) {
    conditions.push(
      or(
        gt(comment.createdAt, new Date(cursor.createdAt)),
        and(eq(comment.createdAt, new Date(cursor.createdAt)), gt(comment.id, cursor.id)),
      )!,
    );
  }

  const topRows = db
    .select({
      id: comment.id,
      parentId: comment.parentId,
      authorName: comment.authorName,
      content: comment.content,
      createdAt: comment.createdAt,
    })
    .from(comment)
    .where(and(...conditions))
    .orderBy(asc(comment.createdAt), asc(comment.id))
    .limit(limit + 1)
    .all();

  const pageRows = topRows.slice(0, limit);
  const last = pageRows[pageRows.length - 1];
  const nextCursor = topRows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null;

  const parentIds = pageRows.map((row) => row.id);
  const replyRows = parentIds.length
    ? db
        .select({
          id: comment.id,
          parentId: comment.parentId,
          authorName: comment.authorName,
          content: comment.content,
          createdAt: comment.createdAt,
        })
        .from(comment)
        .where(
          and(
            eq(comment.postSlug, postSlug),
            eq(comment.status, 'approved'),
            isNull(comment.deletedAt),
            inArray(comment.parentId, parentIds),
          ),
        )
        .orderBy(asc(comment.createdAt), asc(comment.id))
        .limit(200)
        .all()
    : [];

  return {
    items: [...pageRows, ...replyRows].map(toDto),
    nextCursor,
  };
}

export function createComment(
  postSlug: string,
  input: CommentInput,
  meta: RequestMeta,
): { id: string; status: CommentStatus } {
  assertCommentTarget(postSlug);

  const idempotencyHash = hashIdempotencyKey(meta.idempotencyKey);
  const existing = db
    .select({ id: comment.id, status: comment.status })
    .from(comment)
    .where(eq(comment.idempotencyKeyHash, idempotencyHash))
    .get();

  if (existing) {
    return { id: existing.id, status: existing.status };
  }

  let parentId: string | null = null;
  if (input.parentId) {
    const parent = db
      .select({
        id: comment.id,
        parentId: comment.parentId,
        status: comment.status,
        deletedAt: comment.deletedAt,
      })
      .from(comment)
      .where(eq(comment.id, input.parentId))
      .get();

    if (
      !parent ||
      parent.status !== 'approved' ||
      parent.deletedAt !== null ||
      parent.parentId !== null
    ) {
      throw new AppError('K1-CMT-004');
    }
    parentId = parent.id;
  }

  const cleanName = input.authorName
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, '')
    .trim();
  const cleanContent = input.content
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\ufeff]/g, '')
    .trim();

  if (!cleanName || !cleanContent) throw new AppError('K1-CMT-003');

  const now = new Date();
  const ipHash = hashIp(meta.ip);
  const policySnapshot = loadModerationPolicy();
  const verdict = evaluateCommentCandidate(
    {
      postSlug,
      authorName: cleanName,
      content: cleanContent,
      website: input.website,
      ipHash,
      elapsedMs: now.getTime() - input.formStartedAt,
      at: now,
    },
    policySnapshot.policy,
  );

  const status: CommentStatus = verdict.action;
  const moderated = status !== 'pending';
  const id = uuidv7();

  try {
    db.transaction((tx) => {
      tx.insert(comment)
        .values({
          id,
          postSlug,
          parentId,
          authorName: cleanName,
          content: cleanContent,
          status,
          ipHash,
          userAgentSummary: meta.userAgent?.slice(0, 120) ?? null,
          idempotencyKeyHash: idempotencyHash,
          createdAt: now,
          updatedAt: now,
          moderatedAt: moderated ? now : null,
          moderatedBy: moderated ? AUTOMATION_ACTOR : null,
          moderationNote: moderated ? autoNote(verdict.score) : null,
        })
        .run();

      writeAutomationRecord(tx, {
        commentId: id,
        action: verdict.action,
        score: verdict.score,
        reasons: verdict.reasons,
        policyRevision: policySnapshot.revision,
        fromStatus: null,
        now,
      });
    });
  } catch (error) {
    const raced = db
      .select({ id: comment.id, status: comment.status })
      .from(comment)
      .where(eq(comment.idempotencyKeyHash, idempotencyHash))
      .get();
    if (raced) return { id: raced.id, status: raced.status };
    throw new AppError('K1-DB-002', { cause: error });
  }

  return { id, status };
}
