import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

import { db } from '@/lib/db/client-core';
import {
  comment,
  commentModeration,
  moderationAudit,
  moderationPolicyRevision,
} from '@/lib/db/schema';
import { logWarn } from '@/lib/logging/logger';
import {
  DEFAULT_MODERATION_POLICY,
  FALLBACK_MODERATION_POLICY,
  moderationPolicySchema,
  type ModerationAction,
  type ModerationPolicy,
  type ModerationReason,
} from './automation';
import { evaluateCommentCandidate } from './automation-context';

export const AUTOMATION_ACTOR = 'system:automation';

export type ModerationPolicySnapshot = {
  policy: ModerationPolicy;
  revision: number;
  updatedAt: string | null;
  updatedBy: string | null;
  source: 'default' | 'stored' | 'fallback';
};

export type ModerationSweepResult = {
  processed: number;
  approved: number;
  rejected: number;
  spam: number;
  pending: number;
  skipped: number;
};

export type SaveModerationPolicyResult = {
  snapshot: ModerationPolicySnapshot;
  sweep: ModerationSweepResult;
};

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function parseStoredPolicy(settings: string): ModerationPolicy | null {
  try {
    const parsed = moderationPolicySchema.safeParse(JSON.parse(settings));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function loadModerationPolicy(): ModerationPolicySnapshot {
  const row = db
    .select()
    .from(moderationPolicyRevision)
    .orderBy(desc(moderationPolicyRevision.revision))
    .limit(1)
    .get();

  if (!row) {
    return {
      policy: DEFAULT_MODERATION_POLICY,
      revision: 0,
      updatedAt: null,
      updatedBy: null,
      source: 'default',
    };
  }

  const policy = parseStoredPolicy(row.settings);
  if (!policy) {
    logWarn('moderation_policy_invalid', { revision: row.revision });
    return {
      policy: FALLBACK_MODERATION_POLICY,
      revision: row.revision,
      updatedAt: row.createdAt.toISOString(),
      updatedBy: row.actorId,
      source: 'fallback',
    };
  }

  return {
    policy,
    revision: row.revision,
    updatedAt: row.createdAt.toISOString(),
    updatedBy: row.actorId,
    source: 'stored',
  };
}

export function autoNote(score: number): string {
  return `自动判定：风险 ${score}`;
}

function auditAction(action: ModerationAction): 'approve' | 'reject' | 'spam' | null {
  if (action === 'approved') return 'approve';
  if (action === 'rejected') return 'reject';
  if (action === 'spam') return 'spam';
  return null;
}

export function writeAutomationRecord(
  tx: DatabaseTransaction,
  input: {
    commentId: string;
    action: ModerationAction;
    score: number;
    reasons: ModerationReason[];
    policyRevision: number;
    fromStatus: string | null;
    now: Date;
  },
): void {
  tx.insert(commentModeration)
    .values({
      commentId: input.commentId,
      action: input.action,
      score: input.score,
      reasons: JSON.stringify(input.reasons),
      policyRevision: input.policyRevision,
      evaluatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: commentModeration.commentId,
      set: {
        action: input.action,
        score: input.score,
        reasons: JSON.stringify(input.reasons),
        policyRevision: input.policyRevision,
        evaluatedAt: input.now,
      },
    })
    .run();

  const action = auditAction(input.action);
  if (!action) return;

  tx.insert(moderationAudit)
    .values({
      id: uuidv7(),
      actorId: AUTOMATION_ACTOR,
      action,
      commentId: input.commentId,
      fromStatus: input.fromStatus,
      toStatus: input.action,
      note: autoNote(input.score),
      createdAt: input.now,
    })
    .run();
}

export function saveModerationPolicy(
  policy: ModerationPolicy,
  actorId: string,
): SaveModerationPolicyResult {
  const pendingRows = policy.sweepPendingOnSave
    ? db
        .select({
          id: comment.id,
          postSlug: comment.postSlug,
          authorName: comment.authorName,
          content: comment.content,
          ipHash: comment.ipHash,
          createdAt: comment.createdAt,
        })
        .from(comment)
        .where(and(eq(comment.status, 'pending'), isNull(comment.deletedAt)))
        .orderBy(asc(comment.createdAt), asc(comment.id))
        .all()
    : [];

  const evaluations = pendingRows.map((row) => ({
    row,
    verdict: evaluateCommentCandidate(
      {
        postSlug: row.postSlug,
        authorName: row.authorName,
        content: row.content,
        website: '',
        ipHash: row.ipHash,
        elapsedMs: null,
        at: row.createdAt,
      },
      policy,
    ),
  }));

  const sweep: ModerationSweepResult = {
    processed: evaluations.length,
    approved: 0,
    rejected: 0,
    spam: 0,
    pending: 0,
    skipped: 0,
  };
  const now = new Date();
  let revision = 0;

  db.transaction((tx) => {
    const last = tx
      .select({ revision: moderationPolicyRevision.revision })
      .from(moderationPolicyRevision)
      .orderBy(desc(moderationPolicyRevision.revision))
      .limit(1)
      .get();
    revision = (last?.revision ?? 0) + 1;

    tx.insert(moderationPolicyRevision)
      .values({
        revision,
        settings: JSON.stringify(policy),
        actorId,
        createdAt: now,
      })
      .run();

    for (const { row, verdict } of evaluations) {
      if (verdict.action === 'pending') {
        const stillPending = tx
          .select({ id: comment.id })
          .from(comment)
          .where(
            and(eq(comment.id, row.id), eq(comment.status, 'pending'), isNull(comment.deletedAt)),
          )
          .get();
        if (!stillPending) {
          sweep.skipped += 1;
          continue;
        }

        writeAutomationRecord(tx, {
          commentId: row.id,
          action: verdict.action,
          score: verdict.score,
          reasons: verdict.reasons,
          policyRevision: revision,
          fromStatus: 'pending',
          now,
        });
        sweep.pending += 1;
        continue;
      }

      const result = tx
        .update(comment)
        .set({
          status: verdict.action,
          updatedAt: now,
          moderatedAt: now,
          moderatedBy: AUTOMATION_ACTOR,
          moderationNote: autoNote(verdict.score),
        })
        .where(
          and(eq(comment.id, row.id), eq(comment.status, 'pending'), isNull(comment.deletedAt)),
        )
        .run();

      if (result.changes === 0) {
        sweep.skipped += 1;
        continue;
      }

      writeAutomationRecord(tx, {
        commentId: row.id,
        action: verdict.action,
        score: verdict.score,
        reasons: verdict.reasons,
        policyRevision: revision,
        fromStatus: 'pending',
        now,
      });
      sweep[verdict.action] += 1;
    }
  });

  return {
    snapshot: {
      policy,
      revision,
      updatedAt: now.toISOString(),
      updatedBy: actorId,
      source: 'stored',
    },
    sweep,
  };
}
