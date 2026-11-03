# K1Blog 数据库设计

> 版本：v1.1.0  
> 引擎：SQLite 3（WAL）  
> ORM：Drizzle ORM 0.45.4 + better-sqlite3 13.0.3  
> Schema：`lib/db/schema.ts`  
> 迁移：`drizzle/`（`drizzle.config.ts`）

## 1. 设计原则

- 单数据库文件，单实例部署；写路径短、事务小。
- 所有时间使用整数毫秒时间戳（`timestamp_ms`），由应用写入，避免数据库时区差异。
- 评论不物理删除公开数据；先软删除，再按保留策略清理。
- 个人数据最小化：留言只收昵称与正文、IP 哈希、UA 截断；公开接口不返回任何联系方式。
- 每个索引都对应一个真实查询；不预建“可能有用”的索引。

## 2. ER 关系

```text
user 1 ─── n session
user 1 ─── n account

comment 1 ─── n comment (parent_id, 仅允许一层回复)
comment 1 ─── n moderation_audit (逻辑关联，无外键)
comment 1 ─── 1 comment_moderation (自动判定快照，外键级联)
moderation_policy_revision（追加式策略修订，无外键）
```

- `comment.parent_id` 自引用，`ON DELETE SET NULL`。
- 应用层限制：父评论必须是 `approved` 顶层评论；回复不能再回复。
- `moderation_audit.comment_id` 为逻辑关联，不设外键，保留评论物理清理后的审计痕迹。
- `comment_moderation.comment_id` 外键指向评论，评论物理清理时级联删除。
- `moderation_policy_revision` 只追加、不覆盖；最新修订号即当前策略。

## 3. 认证表（Better Auth 管理）

### user

| 字段             | 类型          | 约束                    | 说明             |
| ---------------- | ------------- | ----------------------- | ---------------- |
| `id`             | text          | PK                      | Better Auth 生成 |
| `name`           | text          | NOT NULL                | 管理员名称       |
| `email`          | text          | NOT NULL, UNIQUE        | 登录邮箱         |
| `email_verified` | integer(bool) | NOT NULL, default false | 邮箱验证状态     |
| `image`          | text          | NULL                    | 预留             |
| `created_at`     | integer(ms)   | NOT NULL                | 创建时间         |
| `updated_at`     | integer(ms)   | NOT NULL                | 更新时间         |

### session

| 字段                        | 类型        | 约束                            | 说明             |
| --------------------------- | ----------- | ------------------------------- | ---------------- |
| `id`                        | text        | PK                              | 会话 ID          |
| `expires_at`                | integer(ms) | NOT NULL                        | 过期时间（7 天） |
| `token`                     | text        | NOT NULL, UNIQUE                | 会话 token       |
| `created_at` / `updated_at` | integer(ms) | NOT NULL                        | 时间戳           |
| `ip_address`                | text        | NULL                            | Better Auth 记录 |
| `user_agent`                | text        | NULL                            | Better Auth 记录 |
| `user_id`                   | text        | NOT NULL, FK → user.id, CASCADE | 所属用户         |

### account

| 字段                                                   | 类型        | 约束                            | 说明                         |
| ------------------------------------------------------ | ----------- | ------------------------------- | ---------------------------- |
| `id`                                                   | text        | PK                              | 账户记录                     |
| `account_id`                                           | text        | NOT NULL                        | Better Auth 账户标识         |
| `provider_id`                                          | text        | NOT NULL                        | 当前为 `credential`          |
| `user_id`                                              | text        | NOT NULL, FK → user.id, CASCADE | 所属用户                     |
| `password`                                             | text        | NULL                            | 密码哈希（Better Auth 管理） |
| `access_token` / `refresh_token` / `id_token`          | text        | NULL                            | OAuth 预留                   |
| `access_token_expires_at` / `refresh_token_expires_at` | integer(ms) | NULL                            | 预留                         |
| `scope`                                                | text        | NULL                            | 预留                         |
| `created_at` / `updated_at`                            | integer(ms) | NOT NULL                        | 时间戳                       |

### verification

| 字段                        | 类型        | 约束     | 说明     |
| --------------------------- | ----------- | -------- | -------- |
| `id`                        | text        | PK       | 验证记录 |
| `identifier`                | text        | NOT NULL | 标识     |
| `value`                     | text        | NOT NULL | 验证值   |
| `expires_at`                | integer(ms) | NOT NULL | 过期时间 |
| `created_at` / `updated_at` | integer(ms) | NULL     | 时间戳   |

## 4. 评论表

### comment

| 字段                        | 类型        | 约束                            | 说明                             |
| --------------------------- | ----------- | ------------------------------- | -------------------------------- |
| `id`                        | text        | PK                              | UUIDv7，按时间有序               |
| `post_slug`                 | text        | NOT NULL                        | 文章 slug                        |
| `parent_id`                 | text        | NULL, FK → comment.id, SET NULL | 父评论；仅一层                   |
| `author_name`               | text        | NOT NULL                        | 昵称，已清理控制字符             |
| `content`                   | text        | NOT NULL                        | 纯文本正文                       |
| `status`                    | text        | NOT NULL, default pending       | `pending/approved/rejected/spam` |
| `ip_hash`                   | text        | NOT NULL                        | 带 pepper 的 HMAC                |
| `user_agent_summary`        | text        | NULL                            | 截断至 120 字符                  |
| `idempotency_key_hash`      | text        | NOT NULL                        | 幂等键 HMAC                      |
| `created_at` / `updated_at` | integer(ms) | NOT NULL                        | 时间戳                           |
| `moderated_at`              | integer(ms) | NULL                            | 审核时间                         |
| `moderated_by`              | text        | NULL                            | 管理员 user.id                   |
| `moderation_note`           | text        | NULL                            | 审核备注                         |
| `deleted_at`                | integer(ms) | NULL                            | 软删除时间                       |

索引：

| 索引                              | 字段                            | 用途               |
| --------------------------------- | ------------------------------- | ------------------ |
| `uk_comment_idempotency`          | `idempotency_key_hash` UNIQUE   | 幂等去重、并发兜底 |
| `idx_comment_post_status_created` | `post_slug, status, created_at` | 公开评论分页       |
| `idx_comment_parent_status`       | `parent_id, status`             | 回复查询           |
| `idx_comment_status_created`      | `status, created_at`            | 管理端筛选与清理   |

### moderation_audit

| 字段          | 类型        | 约束     | 说明                                 |
| ------------- | ----------- | -------- | ------------------------------------ |
| `id`          | text        | PK       | UUIDv7                               |
| `actor_id`    | text        | NOT NULL | 管理员 user.id 或 `system`           |
| `action`      | text        | NOT NULL | `approve/reject/spam/delete/restore` |
| `comment_id`  | text        | NOT NULL | 逻辑关联评论                         |
| `from_status` | text        | NULL     | 变更前状态                           |
| `to_status`   | text        | NULL     | 变更后状态                           |
| `note`        | text        | NULL     | 备注                                 |
| `created_at`  | integer(ms) | NOT NULL | 时间戳                               |

索引：`idx_audit_comment_created (comment_id, created_at)`。

### comment_moderation

| 字段              | 类型        | 约束                         | 说明                             |
| ----------------- | ----------- | ---------------------------- | -------------------------------- |
| `comment_id`      | text        | PK, FK → comment.id, CASCADE | 一评论一条最新自动判定           |
| `action`          | text        | NOT NULL                     | `approved/pending/rejected/spam` |
| `score`           | integer     | NOT NULL                     | 风险分 0–100                     |
| `reasons`         | text        | NOT NULL                     | JSON 数组：机器码、标签、权重    |
| `policy_revision` | integer     | NOT NULL                     | 判定使用的策略修订               |
| `evaluated_at`    | integer(ms) | NOT NULL                     | 判定时间                         |

索引：`idx_comment_moderation_action_evaluated (action, evaluated_at)`，用于 24 小时自动发布/拦截统计。

### moderation_policy_revision

| 字段         | 类型        | 约束     | 说明                     |
| ------------ | ----------- | -------- | ------------------------ |
| `revision`   | integer     | PK       | 从 1 递增的修订号        |
| `settings`   | text        | NOT NULL | 完整策略 JSON 快照       |
| `actor_id`   | text        | NOT NULL | 保存策略的管理员 user.id |
| `created_at` | integer(ms) | NOT NULL | 修订时间                 |

不设索引；读取最新修订使用主键倒序，历史修订用于追溯。

## 5. 状态机

```text
提交 ──自动审核──┬─ 低风险 ──> approved（即时公开）
                  ├─ 边界风险 ─> pending ──人工/策略复核──> approved / rejected / spam
                  └─ 高风险 ──> rejected / spam
approved ──软删除──→ deleted_at 非空（不再公开）
```

- 自动审核关闭时，除蜜罐命中外一律 → `pending`。
- 状态更新使用乐观并发：`WHERE id = ? AND status = 当前状态 AND deleted_at IS NULL`。
- 自动发布/拦截写 `comment_moderation` 与 `moderation_audit`；自动待审只写判定快照。
- 保存策略时在同一事务内追加修订并复核存量待审；复核只更新仍为 `pending` 的记录。
- 状态未变时直接返回，不写审计。
- 删除是软删除；审计保留。

## 6. 隐私与加密

- 留言只收集昵称与正文，不收集邮箱或其他身份信息。
- IP 哈希 / 幂等哈希：HMAC-SHA256，密钥来自 `COMMENT_IP_PEPPER` / `BETTER_AUTH_SECRET`。
- 更换 `COMMENT_IP_PEPPER` 后历史 IP 哈希无法与新增记录关联；更换 `BETTER_AUTH_SECRET` 会使现有会话与 CSRF token 失效。轮换前必须阅读 `RUNBOOK.md`。

## 7. 迁移

```bash
pnpm db:generate   # 修改 schema 后生成 SQL
pnpm db:migrate    # 应用迁移
pnpm db:check      # 校验表与完整性
```

- 迁移文件必须随代码提交，不允许只改 schema 不改迁移。
- 生产容器启动时由 `scripts/entrypoint.mjs` 自动执行迁移；失败则容器退出，不启动 server。
- 迁移前必须备份；破坏性迁移（删列/改类型）必须提供回滚脚本或可恢复备份。
- `__drizzle_migrations` 由 Drizzle 维护，不得手工修改。

## 8. 备份与恢复

备份：

```bash
pnpm db:backup
# 产物：data/backups/k1blog-<ISO>.db
```

- 使用 SQLite online backup API，允许运行中备份。
- 备份后执行 `PRAGMA integrity_check`，失败则命令退出码非 0。
- 备份文件包含个人数据（IP 哈希），必须按敏感数据保管。

恢复（停机执行）：

```bash
# Docker：先停止 app，再用临时容器把备份写入卷
docker compose stop app
docker compose run --rm --no-deps -v "$PWD/backups:/backup" app \
  sh -c "cp /backup/<file>.db /app/data/k1blog.db && rm -f /app/data/k1blog.db-wal /app/data/k1blog.db-shm"
docker compose start app

# 非 Docker：直接替换 DATABASE_PATH 指向的文件
cp data/backups/k1blog-<ISO>.db data/k1blog.db
rm -f data/k1blog.db-wal data/k1blog.db-shm
```

恢复后执行 `curl -fsS <SITE_URL>/api/v1/health/ready` 并做一次登录、策略读取与留言台账冒烟。

## 9. 保留与清理

`pnpm comments:purge` 删除：

- 30 天前仍为 `pending/rejected/spam` 的评论；
- 30 天前已软删除且没有子回复的评论；
- 180 天前的审核审计。

评论物理删除时，`comment_moderation` 通过外键级联删除；`moderation_policy_revision` 不参与清理，保留完整策略历史。策略修订只含参数与管理员 user.id，不含评论正文或个人联系信息。

策略理由：

- 未通过评论长期保留没有公开价值，且增加隐私暴露面。
- 软删除保留 30 天用于误删恢复窗口。
- 审计保留 180 天，覆盖常规追溯周期。

清理前建议先备份。该命令是物理删除，不可回滚。

## 10. 容量与并发

- SQLite 单写者；WAL 允许并发读。
- 评论写入为短事务；审核与审计在同一事务内。
- 单实例下进程内限流 + Nginx 限流已足够；多实例部署前必须迁移数据库或引入外部限流。
- 预期容量：个人博客规模（万级评论、十万级读请求/月）无需分表。
