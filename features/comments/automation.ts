import { z } from 'zod';

import { WORD_LIST_MAX, WORD_TERM_MAX } from './word-list';

const listSchema = z
  .array(z.string().trim().min(1).max(WORD_TERM_MAX))
  .max(WORD_LIST_MAX)
  .transform((items) => [...new Set(items)]);

export const moderationPolicySchema = z
  .object({
    enabled: z.boolean(),
    autoApproveMaxRisk: z.number().int().min(0).max(99),
    autoBlockMinRisk: z.number().int().min(1).max(100),
    blockAction: z.enum(['spam', 'rejected']),
    minSubmitSeconds: z.number().int().min(0).max(300),
    maxSubmitAgeMinutes: z.number().int().min(1).max(10080),
    maxLinks: z.number().int().min(0).max(10),
    duplicateWindowMinutes: z.number().int().min(0).max(1440),
    duplicateLimit: z.number().int().min(0).max(20),
    ipWindowMinutes: z.number().int().min(1).max(1440),
    ipMaxComments: z.number().int().min(1).max(100),
    bannedKeywords: listSchema,
    blockedNames: listSchema,
    sweepPendingOnSave: z.boolean(),
  })
  .superRefine((policy, context) => {
    if (policy.autoBlockMinRisk <= policy.autoApproveMaxRisk) {
      context.addIssue({
        code: 'custom',
        path: ['autoBlockMinRisk'],
        message: '自动拦截下限必须大于自动发布上限',
      });
    }
  });

export type ModerationPolicy = z.infer<typeof moderationPolicySchema>;

export const DEFAULT_MODERATION_POLICY: ModerationPolicy = {
  enabled: true,
  autoApproveMaxRisk: 30,
  autoBlockMinRisk: 70,
  blockAction: 'spam',
  minSubmitSeconds: 2,
  maxSubmitAgeMinutes: 360,
  maxLinks: 3,
  duplicateWindowMinutes: 60,
  duplicateLimit: 1,
  ipWindowMinutes: 60,
  ipMaxComments: 8,
  bannedKeywords: [
    '博彩',
    '赌场',
    '代开发票',
    '刷单',
    '加微信',
    '贷款秒批',
    'casino',
    'viagra',
    'porn',
  ],
  blockedNames: [],
  sweepPendingOnSave: true,
};

export const FALLBACK_MODERATION_POLICY: ModerationPolicy = {
  ...DEFAULT_MODERATION_POLICY,
  enabled: false,
};

export const moderationReasonSchema = z.object({
  code: z.string().min(1).max(48),
  label: z.string().min(1).max(80),
  weight: z.number().int().min(0).max(100),
});

export const moderationReasonsSchema = z.array(moderationReasonSchema).max(20);

export type ModerationReason = z.infer<typeof moderationReasonSchema>;

export type ModerationAction = 'approved' | 'pending' | 'rejected' | 'spam';

export type ModerationEvaluationInput = {
  authorName: string;
  content: string;
  website: string;
  elapsedMs: number | null;
  priorIpComments: number;
  priorDuplicateComments: number;
};

export type ModerationVerdict = {
  action: ModerationAction;
  score: number;
  reasons: ModerationReason[];
};

const LINK_PATTERN = /https?:\/\/|www\./gi;
const NAME_LINK_PATTERN = /https?:\/\/|www\./i;
const PUNCTUATION_PATTERN = /[!?！？~～]/g;

function countLinks(content: string): number {
  return (content.match(LINK_PATTERN) ?? []).length;
}

function hasRepeatedCharacters(content: string): boolean {
  const compact = content.replace(/\s+/g, '');
  if (compact.length < 10) return false;
  const counts = new Map<string, number>();
  for (const char of compact) counts.set(char, (counts.get(char) ?? 0) + 1);
  const max = Math.max(...counts.values());
  return max / compact.length >= 0.5;
}

function pushReason(reasons: ModerationReason[], reason: ModerationReason) {
  reasons.push(reason);
}

export function evaluateComment(
  input: ModerationEvaluationInput,
  policy: ModerationPolicy,
): ModerationVerdict {
  const reasons: ModerationReason[] = [];

  if (input.website.trim().length > 0) {
    return {
      action: 'spam',
      score: 100,
      reasons: [{ code: 'honeypot', label: '蜜罐字段非空', weight: 100 }],
    };
  }

  if (input.elapsedMs !== null && input.elapsedMs < policy.minSubmitSeconds * 1000) {
    pushReason(reasons, { code: 'submit_too_fast', label: '提交速度异常', weight: 40 });
  }

  if (input.elapsedMs !== null && input.elapsedMs > policy.maxSubmitAgeMinutes * 60_000) {
    pushReason(reasons, { code: 'form_too_old', label: '表单停留过久', weight: 15 });
  }

  const links = countLinks(input.content);
  if (links > policy.maxLinks) {
    const weight = Math.min(60, (links - policy.maxLinks) * 20);
    pushReason(reasons, { code: 'too_many_links', label: '链接数量超限', weight });
  }

  const lowerContent = input.content.toLocaleLowerCase();
  const keywordHits = policy.bannedKeywords.filter((keyword) =>
    lowerContent.includes(keyword.toLocaleLowerCase()),
  ).length;
  if (keywordHits > 0) {
    pushReason(reasons, {
      code: 'banned_keyword',
      label: '违禁词命中',
      weight: Math.min(90, keywordHits * 45),
    });
  }

  const normalizedName = input.authorName.trim().toLocaleLowerCase();
  if (policy.blockedNames.some((name) => name.toLocaleLowerCase() === normalizedName)) {
    pushReason(reasons, { code: 'blocked_name', label: '昵称黑名单', weight: 60 });
  }

  if (NAME_LINK_PATTERN.test(input.authorName)) {
    pushReason(reasons, { code: 'name_contains_link', label: '昵称含链接', weight: 30 });
  }

  if (policy.duplicateWindowMinutes > 0 && input.priorDuplicateComments > policy.duplicateLimit) {
    const excess = input.priorDuplicateComments - policy.duplicateLimit;
    pushReason(reasons, {
      code: 'duplicate_content',
      label: '重复内容',
      weight: Math.min(70, 35 + (excess - 1) * 10),
    });
  }

  if (input.priorIpComments > policy.ipMaxComments) {
    pushReason(reasons, { code: 'ip_frequency', label: '来源频率异常', weight: 35 });
  }

  if (hasRepeatedCharacters(input.content)) {
    pushReason(reasons, { code: 'repeated_characters', label: '字符重复异常', weight: 15 });
  }

  if ((input.content.match(PUNCTUATION_PATTERN) ?? []).length >= 6) {
    pushReason(reasons, { code: 'punctuation_stack', label: '标点堆叠', weight: 12 });
  }

  const score = Math.min(
    100,
    reasons.reduce((total, reason) => total + reason.weight, 0),
  );
  reasons.sort((left, right) => right.weight - left.weight);

  if (!policy.enabled) {
    return { action: 'pending', score, reasons };
  }

  if (score >= policy.autoBlockMinRisk) {
    return { action: policy.blockAction, score, reasons };
  }

  if (score > policy.autoApproveMaxRisk) {
    return { action: 'pending', score, reasons };
  }

  return { action: 'approved', score, reasons };
}
