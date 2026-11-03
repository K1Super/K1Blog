import { requireAdminApi } from '@/features/admin/auth';
import { moderationInputSchema } from '@/features/comments/schema';
import { deleteComment, moderateComment } from '@/features/comments/admin-service';
import { AppError } from '@/lib/errors/app-error';
import { errorResponse, jsonResponse } from '@/lib/errors/response';
import { readJson } from '@/lib/http/json';
import { getRequestId } from '@/lib/http/request';
import { logError, logInfo, logWarn } from '@/lib/logging/logger';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const session = await requireAdminApi(request, true);
    const { id } = await context.params;
    const body = await readJson(request);
    const parsed = moderationInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError('K1-REQ-002', {
        message: '审核参数非法',
        fieldErrors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      });
    }
    const result = moderateComment(id, parsed.data.status, session.user.id, parsed.data.note);
    logInfo('comment_moderated', { requestId, commentId: id, status: result.status });
    return jsonResponse(result, requestId);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    if (status >= 500) logError('admin_comment_patch_failed', { requestId });
    else logWarn('admin_comment_patch_rejected', { requestId });
    return errorResponse(error, requestId, new URL(request.url).pathname);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    const session = await requireAdminApi(request, true);
    const { id } = await context.params;
    deleteComment(id, session.user.id);
    logInfo('comment_deleted', { requestId, commentId: id });
    return new Response(null, {
      status: 204,
      headers: { 'X-Request-Id': requestId, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    if (status >= 500) logError('admin_comment_delete_failed', { requestId });
    else logWarn('admin_comment_delete_rejected', { requestId });
    return errorResponse(error, requestId, new URL(request.url).pathname);
  }
}
