import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { db, rawDb } from '../lib/db/client-core';

try {
  migrate(db, { migrationsFolder: 'drizzle' });
  console.log('migrations ok');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  rawDb.close();
}
