import { and, count, eq, gte, isNull, lt } from 'drizzle-orm';

import { db } from '@/lib/db/client-core';
import { comment } from '@/lib/db/schema';
import { evaluateComment, type ModerationPolicy, type ModerationVerdict } from './automation';

function countPriorIpComments(ipHash: string, at: Date, policy: ModerationPolicy): number {
  const since = new Date(at.getTime() - policy.ipWindowMinutes * 60_000);
  const row = db
    .select({ value: count() })
    .from(comment)
    .where(
      and(
        eq(comment.ipHash, ipHash),
        gte(comment.createdAt, since),
        lt(comment.createdAt, at),
        isNull(comment.deletedAt),
      ),
    )
    .get();
  return row?.value ?? 0;
}

function countPriorDuplicates(
  postSlug: string,
  content: string,
  at: Date,
  policy: ModerationPolicy,
): number {
  if (policy.duplicateWindowMinutes <= 0) return 0;
  const since = new Date(at.getTime() - policy.duplicateWindowMinutes * 60_000);
  const row = db
    .select({ value: count() })
    .from(comment)
    .where(
      and(
        eq(comment.postSlug, postSlug),
        eq(comment.content, content),
        gte(comment.createdAt, since),
        lt(comment.createdAt, at),
        isNull(comment.deletedAt),
      ),
    )
    .get();
  return row?.value ?? 0;
}

export function evaluateCommentCandidate(
  input: {
    postSlug: string;
    authorName: string;
    content: string;
    website: string;
    ipHash: string;
    elapsedMs: number | null;
    at: Date;
  },
  policy: ModerationPolicy,
): ModerationVerdict {
  return evaluateComment(
    {
      authorName: input.authorName,
      content: input.content,
      website: input.website,
      elapsedMs: input.elapsedMs,
      priorIpComments: countPriorIpComments(input.ipHash, input.at, policy),
      priorDuplicateComments: countPriorDuplicates(input.postSlug, input.content, input.at, policy),
    },
    policy,
  );
}
