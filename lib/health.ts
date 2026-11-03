import { rawDb } from '@/lib/db/client-core';

export function checkDatabaseReady(): boolean {
  try {
    const row = rawDb.prepare('select 1 as ok').get() as { ok?: number } | undefined;
    return row?.ok === 1;
  } catch {
    return false;
  }
}
