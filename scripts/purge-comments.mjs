import path from 'node:path';

import Database from 'better-sqlite3';

const configured = process.env.DATABASE_PATH ?? './data/k1blog.db';
const databasePath = path.isAbsolute(configured)
  ? configured
  : path.join(process.cwd(), configured);

const db = new Database(databasePath, { timeout: 5000 });
db.pragma('foreign_keys = ON');

const now = Date.now();
const thirtyDays = 30 * 24 * 60 * 60 * 1000;
const cutoff = now - thirtyDays;

const stale = db
  .prepare(
    `delete from comment
     where status in ('pending', 'rejected', 'spam')
       and created_at < ?`,
  )
  .run(cutoff);

const deleted = db
  .prepare(
    `delete from comment
     where deleted_at is not null
       and deleted_at < ?
       and id not in (select coalesce(parent_id, '') from comment where parent_id is not null)`,
  )
  .run(cutoff);

const audit = db
  .prepare('delete from moderation_audit where created_at < ?')
  .run(now - 180 * 24 * 60 * 60 * 1000);

db.close();
console.log(`[purge] comments=${stale.changes + deleted.changes} audit=${audit.changes}`);
