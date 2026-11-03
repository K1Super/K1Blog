import 'server-only';

import nodemailer from 'nodemailer';

import { env } from '@/lib/env';
import { logWarn } from '@/lib/logging/logger';

export async function notifyAdminNewComment(input: {
  postSlug: string;
  authorName: string;
  content: string;
}) {
  if (!env.SMTP_URL || !env.ADMIN_EMAIL) return;

  try {
    const transporter = nodemailer.createTransport(env.SMTP_URL);
    await transporter.sendMail({
      from: env.SMTP_FROM ?? env.ADMIN_EMAIL,
      to: env.ADMIN_EMAIL,
      subject: '新留言待审',
      text: [
        `来源：${input.postSlug === 'about' ? '关于页面 / 留言' : `文章 / ${input.postSlug}`}`,
        `昵称：${input.authorName}`,
        '',
        input.content,
        '',
        '请进入管理端审核。',
      ].join('\n'),
    });
  } catch (error) {
    logWarn('comment_notification_failed', {
      postSlug: input.postSlug,
      reason: error instanceof Error ? error.name : 'unknown',
    });
  }
}
