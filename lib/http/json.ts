import { AppError } from '@/lib/errors/app-error';

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError('K1-REQ-001');
  }
}

export function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new AppError('K1-REQ-002');
  }
  return parsed;
}
