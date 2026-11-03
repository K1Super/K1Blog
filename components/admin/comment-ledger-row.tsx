'use client';

import Link from 'next/link';

import type { AdminCommentDto } from '@/features/comments/schema';
import { formatDateTime } from '@/lib/utils';
import {
  commentDecisionLabel,
  commentReasonLabel,
  commentStatusLabels as statusLabels,
  isManualModeration,
} from './comment-ledger-meta';

export function CommentLedgerRow({
  comment,
  index,
  offset,
  expanded,
  pendingId,
  confirmId,
  onToggleExpand,
  onModerate,
  onConfirmDelete,
  onDelete,
  onCancelDelete,
}: {
  comment: AdminCommentDto;
  index: number;
  offset: number;
  expanded: boolean;
  pendingId: string | null;
  confirmId: string | null;
  onToggleExpand: (id: string) => void;
  onModerate: (id: string, status: 'approved' | 'rejected' | 'spam') => void;
  onConfirmDelete: (id: string) => void;
  onDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const expandable = comment.content.length > 140 || comment.content.split('\n').length > 3;
  const manual = isManualModeration(comment);

  return (
    <li className="ledger-row">
      <span className="ledger-index">{String(offset + index + 1).padStart(3, '0')}</span>
      <div className="ledger-main">
        <div className="ledger-meta">
          <span className="ledger-author">{comment.authorName}</span>
          {comment.postSlug === 'about' ? (
            <span>关于 / 留言</span>
          ) : (
            <Link href={`/posts/${comment.postSlug}`}>{comment.postSlug}</Link>
          )}
          <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
          <span className="ledger-id">{comment.id.slice(0, 8)}</span>
        </div>
        <p
          id={`ledger-content-${comment.id}`}
          className={expandable && !expanded ? 'ledger-content is-clamped' : 'ledger-content'}
        >
          {comment.content}
        </p>
        {expandable ? (
          <button
            type="button"
            className="ledger-expand"
            aria-expanded={expanded}
            aria-controls={`ledger-content-${comment.id}`}
            onClick={() => onToggleExpand(comment.id)}
          >
            {expanded ? '收起' : '展开全文'}
          </button>
        ) : null}
        <div className="ledger-signal">
          <span className={manual ? 'ledger-decision is-manual' : 'ledger-decision'}>
            {commentDecisionLabel(comment)}
          </span>
          {comment.automation ? (
            <span className="ledger-risk">
              RISK {String(comment.automation.score).padStart(3, '0')} / R
              {String(comment.automation.policyRevision).padStart(3, '0')}
            </span>
          ) : null}
          <span className="ledger-reasons">{commentReasonLabel(comment)}</span>
        </div>
      </div>
      <div className="ledger-state">
        <span className={`ledger-status is-${comment.status}`}>{statusLabels[comment.status]}</span>
        <span className="ledger-origin">
          {manual ? 'MANUAL' : comment.automation ? 'AUTO' : 'UNRATED'}
        </span>
      </div>
      <div className="ledger-actions">
        <button
          type="button"
          disabled={pendingId === comment.id || comment.status === 'approved'}
          onClick={() => onModerate(comment.id, 'approved')}
        >
          通过
        </button>
        <button
          type="button"
          disabled={pendingId === comment.id || comment.status === 'rejected'}
          onClick={() => onModerate(comment.id, 'rejected')}
        >
          拒绝
        </button>
        <button
          type="button"
          disabled={pendingId === comment.id || comment.status === 'spam'}
          onClick={() => onModerate(comment.id, 'spam')}
        >
          垃圾
        </button>
        <button
          type="button"
          disabled={pendingId === comment.id}
          onClick={() =>
            confirmId === comment.id ? onDelete(comment.id) : onConfirmDelete(comment.id)
          }
        >
          {confirmId === comment.id ? '确认删除' : '删除'}
        </button>
        {confirmId === comment.id ? (
          <button type="button" onClick={onCancelDelete}>
            取消
          </button>
        ) : null}
      </div>
    </li>
  );
}
