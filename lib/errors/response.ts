import { AppError } from './app-error';
import { errorDefinitions } from './codes';

export function errorResponse(error: unknown, traceId: string, instance?: string): Response {
  const appError = error instanceof AppError ? error : new AppError('K1-SYS-000');
  const definition = errorDefinitions[appError.code];

  const body = {
    type: `urn:k1blog:error:${appError.code.toLowerCase()}`,
    title: definition.message,
    status: appError.status,
    detail: appError.message,
    instance,
    code: appError.code,
    traceId,
    ...(appError.fieldErrors ? { errors: appError.fieldErrors } : {}),
  };

  return new Response(JSON.stringify(body), {
    status: appError.status,
    headers: {
      'Content-Type': 'application/problem+json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': traceId,
    },
  });
}

export function jsonResponse(
  data: unknown,
  traceId: string,
  status = 200,
  meta?: unknown,
): Response {
  return new Response(JSON.stringify(meta === undefined ? { data } : { data, meta }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': traceId,
    },
  });
}
