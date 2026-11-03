import { z } from 'zod';

import type { ModerationAction, ModerationReason } from './automation';

export const commentInputSchema = z.object({
  authorName: z.string().trim().min(1, '昵称不能为空').max(40, '昵称最多 40 个字符'),
  content: z.string().trim().min(1, '留言不能为空').max(2000, '留言最多 2000 个字符'),
  parentId: z.string().uuid('父留言 ID 格式不正确').optional(),
  website: z.string().max(200).optional().default(''),
  formStartedAt: z.number().int().positive('表单时间无效'),
});

export type CommentInput = z.infer<typeof commentInputSchema>;

export const moderationInputSchema = z.object({
  status: z.enum(['approved', 'rejected', 'spam']),
  note: z.string().trim().max(500).optional(),
});

export type ModerationInput = z.infer<typeof moderationInputSchema>;

export type CommentStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export type CommentDto = {
  id: string;
  parentId: string | null;
  authorName: string;
  content: string;
  createdAt: string;
};

export type CommentAutomationDto = {
  action: ModerationAction;
  score: number;
  reasons: ModerationReason[];
  policyRevision: number;
  evaluatedAt: string;
};

export type AdminCommentDto = CommentDto & {
  postSlug: string;
  status: CommentStatus;
  moderatedAt: string | null;
  moderatedBy: string | null;
  moderationNote: string | null;
  automation: CommentAutomationDto | null;
};
