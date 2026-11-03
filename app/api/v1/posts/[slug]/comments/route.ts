import { z } from 'zod';

import { commentInputSchema } from '@/features/comments/schema';
import { createComment, listPublicComments } from '@/features/comments/service';
import { AppError } from '@/lib/errors/app-error';
import { errorResponse, jsonResponse } from '@/lib/errors/response';
import { getClientIp, getRequestId, truncateUserAgent } from '@/lib/http/request';
import { readJson, parsePositiveInt } from '@/lib/http/json';
import { logError, logInfo, logWarn } from '@/lib/logging/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { isTrustedOrigin } from '@/lib/security/origins';
import { hashIp } from '@/lib/security/crypto';
import { notifyAdminNewComment } from '@/lib/email/notify';

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const requestId = getRequestId(request);
  try {
    const { slug } = await context.params;
    const url = new URL(request.url);
    const limit = parsePositiveInt(url.searchParams.get('limit'), 20, 50);
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const result = listPublicComments(slug, { limit, cursor });
    return jsonResponse(result, requestId);
  } catch (error) {
    logWarn('comments_list_failed', {
      requestId,
      code: error instanceof AppError ? error.code : 'K1-SYS-000',
    });
    return errorResponse(error, requestId, new URL(request.url).pathname);
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const requestId = getRequestId(request);
  try {
    if (!isTrustedOrigin(request)) throw new AppError('K1-SEC-001');
    const { slug } = await context.params;
    const body = await readJson(request);
    const parsed = commentInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError('K1-CMT-003', {
        fieldErrors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      });
    }

    const idempotency = z
      .string()
      .min(16)
      .max(64)
      .safeParse(request.headers.get('idempotency-key'));
    if (!idempotency.success) {
      throw new AppError('K1-REQ-002', { message: '缺少或非法的 Idempotency-Key' });
    }

    const ip = getClientIp(request);
    const ipHash = hashIp(ip);
    const checks = [
      checkRateLimit(`comment:ip:${ipHash}:1m`, 5, 60_000),
      checkRateLimit(`comment:ip:${ipHash}:1h`, 20, 60 * 60_000),
    ];
    if (checks.some((check) => !check.ok)) {
      throw new AppError('K1-CMT-007');
    }

    const result = createComment(slug, parsed.data, {
      ip,
      userAgent: truncateUserAgent(request.headers.get('user-agent')),
      idempotencyKey: idempotency.data,
    });

    if (result.status === 'pending') {
      void notifyAdminNewComment({
        postSlug: slug,
        authorName: parsed.data.authorName,
        content: parsed.data.content,
      });
    }

    logInfo('comment_created', {
      requestId,
      postSlug: slug,
      commentId: result.id,
      status: result.status,
    });
    return jsonResponse(
      {
        id: result.id,
        status: result.status === 'approved' ? 'approved' : 'pending',
      },
      requestId,
      202,
    );
  } catch (error) {
    logs(error, requestId, request);
    return errorResponse(error, requestId, new URL(request.url).pathname);
  }
}

function logs(error: unknown, requestId: string, request: Request) {
  const code = error instanceof AppError ? error.code : 'K1-SYS-000';
  const status = error instanceof AppError ? error.status : 500;
  const fields = { requestId, code, path: new URL(request.url).pathname, status };
  if (status >= 500) logError('comments_post_failed', fields);
  else logWarn('comments_post_rejected', fields);
}
