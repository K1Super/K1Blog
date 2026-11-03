import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const comment = sqliteTable(
  'comment',
  {
    id: text('id').primaryKey(),
    postSlug: text('post_slug').notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => comment.id, {
      onDelete: 'set null',
    }),
    authorName: text('author_name').notNull(),
    content: text('content').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected', 'spam'] })
      .notNull()
      .default('pending'),
    ipHash: text('ip_hash').notNull(),
    userAgentSummary: text('user_agent_summary'),
    idempotencyKeyHash: text('idempotency_key_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    moderatedAt: integer('moderated_at', { mode: 'timestamp_ms' }),
    moderatedBy: text('moderated_by'),
    moderationNote: text('moderation_note'),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('uk_comment_idempotency').on(table.idempotencyKeyHash),
    index('idx_comment_post_status_created').on(table.postSlug, table.status, table.createdAt),
    index('idx_comment_parent_status').on(table.parentId, table.status),
    index('idx_comment_status_created').on(table.status, table.createdAt),
  ],
);

export const moderationAudit = sqliteTable(
  'moderation_audit',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    action: text('action', { enum: ['approve', 'reject', 'spam', 'delete', 'restore'] }).notNull(),
    commentId: text('comment_id').notNull(),
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('idx_audit_comment_created').on(table.commentId, table.createdAt)],
);

export const moderationPolicyRevision = sqliteTable('moderation_policy_revision', {
  revision: integer('revision').primaryKey(),
  settings: text('settings').notNull(),
  actorId: text('actor_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const commentModeration = sqliteTable(
  'comment_moderation',
  {
    commentId: text('comment_id')
      .primaryKey()
      .references(() => comment.id, { onDelete: 'cascade' }),
    action: text('action', { enum: ['approved', 'pending', 'rejected', 'spam'] }).notNull(),
    score: integer('score').notNull(),
    reasons: text('reasons').notNull(),
    policyRevision: integer('policy_revision').notNull(),
    evaluatedAt: integer('evaluated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('idx_comment_moderation_action_evaluated').on(table.action, table.evaluatedAt)],
);

export const schema = {
  user,
  session,
  account,
  verification,
  comment,
  moderationAudit,
  moderationPolicyRevision,
  commentModeration,
};
