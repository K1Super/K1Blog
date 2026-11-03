import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { env } from '@/lib/env';
import { schema } from './schema';

const globalForDatabase = globalThis as unknown as { __k1sqlite?: Database.Database };

const sqlite =
  globalForDatabase.__k1sqlite ??
  new Database(env.DATABASE_PATH, {
    timeout: 5000,
  });

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('foreign_keys = ON');

if (env.APP_ENV !== 'production') {
  globalForDatabase.__k1sqlite = sqlite;
}

export const rawDb = sqlite;
export const db = drizzle(sqlite, { schema });
