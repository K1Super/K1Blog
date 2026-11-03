import type { AdminCommentDto, CommentStatus } from '@/features/comments/schema';

export type CommentFilter = CommentStatus | 'all';

export const commentFilters: Array<{ value: CommentFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待审' },
  { value: 'approved', label: '已发布' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'spam', label: '垃圾' },
];

export const commentStatusLabels: Record<CommentStatus, string> = {
  pending: '待审',
  approved: '已发布',
  rejected: '已拒绝',
  spam: '垃圾',
};

const autoLabels = {
  approved: '自动发布',
  pending: '自动待审',
  rejected: '自动拦截',
  spam: '自动拦截',
} as const;

export function isManualModeration(comment: AdminCommentDto): boolean {
  return Boolean(comment.moderatedBy && !comment.moderatedBy.startsWith('system:'));
}

export function commentDecisionLabel(comment: AdminCommentDto): string {
  if (isManualModeration(comment)) {
    if (comment.status === 'approved') return '人工通过';
    if (comment.status === 'rejected') return '人工拒绝';
    if (comment.status === 'spam') return '人工拦截';
    return '人工处置';
  }
  if (!comment.automation) return '未评估';
  return autoLabels[comment.automation.action];
}

export function commentReasonLabel(comment: AdminCommentDto): string {
  if (!comment.automation) return '无自动判定记录';
  if (comment.automation.reasons.length === 0) return '无风险信号';
  return comment.automation.reasons
    .map((reason) => `${reason.label} +${reason.weight}`)
    .join(' · ');
}
