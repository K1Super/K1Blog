import { requireAdminApi } from '@/features/admin/auth';
import { moderationPolicySchema } from '@/features/comments/automation';
import { loadModerationPolicy, saveModerationPolicy } from '@/features/comments/policy-service';
import { AppError } from '@/lib/errors/app-error';
import { errorResponse, jsonResponse } from '@/lib/errors/response';
import { getRequestId } from '@/lib/http/request';
import { readJson } from '@/lib/http/json';
import { logError, logInfo, logWarn } from '@/lib/logging/logger';

const POLICY_BODY_LIMIT = 192 * 1024;

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdminApi(request, false);
    return jsonResponse(loadModerationPolicy(), requestId);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    if (status >= 500) logError('admin_moderation_policy_failed', { requestId });
    else logWarn('admin_moderation_policy_rejected', { requestId });
    return errorResponse(error, requestId, new URL(request.url).pathname);
  }
}

export async function PUT(request: Request) {
  const requestId = getRequestId(request);
  try {
    const session = await requireAdminApi(request, true);
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > POLICY_BODY_LIMIT) {
      throw new AppError('K1-REQ-002', { message: '策略请求体过大' });
    }
    const body = await readJson(request);
    const parsed = moderationPolicySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError('K1-REQ-002', {
        message: '策略参数非法',
        fieldErrors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      });
    }

    const result = saveModerationPolicy(parsed.data, session.user.id);
    logInfo('moderation_policy_updated', {
      requestId,
      revision: result.snapshot.revision,
      processed: result.sweep.processed,
      approved: result.sweep.approved,
      rejected: result.sweep.rejected,
      spam: result.sweep.spam,
    });
    return jsonResponse(result, requestId);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    if (status >= 500) logError('admin_moderation_policy_update_failed', { requestId });
    else logWarn('admin_moderation_policy_update_rejected', { requestId });
    return errorResponse(error, requestId, new URL(request.url).pathname);
  }
}
