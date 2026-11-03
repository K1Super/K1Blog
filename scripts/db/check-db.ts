import { rawDb } from '../../lib/db/client-core';

try {
  const quickCheck = rawDb.prepare('PRAGMA quick_check').get() as { quick_check?: string };
  if (quickCheck.quick_check !== 'ok') {
    throw new Error(`SQLite quick_check failed: ${String(quickCheck.quick_check)}`);
  }
  const tables = rawDb
    .prepare(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name",
    )
    .all() as Array<{ name: string }>;
  console.log(`db ok: ${tables.map((table) => table.name).join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  rawDb.close();
}
