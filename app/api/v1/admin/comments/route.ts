import { z } from 'zod';

import { requireAdminApi } from '@/features/admin/auth';
import { listAdminComments } from '@/features/comments/admin-service';
import type { CommentStatus } from '@/features/comments/schema';
import { AppError } from '@/lib/errors/app-error';
import { errorResponse, jsonResponse } from '@/lib/errors/response';
import { getRequestId } from '@/lib/http/request';
import { parsePositiveInt } from '@/lib/http/json';
import { logError, logWarn } from '@/lib/logging/logger';

const statusSchema = z.enum(['all', 'pending', 'approved', 'rejected', 'spam']);

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdminApi(request, false);
    const url = new URL(request.url);
    const parsedStatus = statusSchema.safeParse(url.searchParams.get('status') ?? 'all');
    if (!parsedStatus.success) throw new AppError('K1-REQ-002');
    const page = parsePositiveInt(url.searchParams.get('page'), 1, 1000);
    const pageSize = parsePositiveInt(url.searchParams.get('pageSize'), 20, 50);
    const result = listAdminComments(parsedStatus.data as CommentStatus | 'all', page, pageSize);
    return jsonResponse({ items: result.items }, requestId, 200, {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    if (status >= 500) logError('admin_comments_failed', { requestId });
    else logWarn('admin_comments_rejected', { requestId });
    return errorResponse(error, requestId, new URL(request.url).pathname);
  }
}
