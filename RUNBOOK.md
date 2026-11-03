# K1Blog 运行手册（Runbook）

> 版本：v1.0.0  
> 适用：本地预览、单机 Docker 生产、非 Docker 备选  
> 原则：先止损，再定位；先备份，再操作；每次操作留证据。

## 1. 日常命令

### 本地

```bash
pnpm dev
pnpm build && pnpm start
pnpm db:check
pnpm db:backup
```

### 生产（Docker）

```bash
docker compose ps
docker compose logs -f --tail=100 app
docker compose logs -f --tail=100 nginx
docker compose restart app
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

### 健康检查

```bash
curl -fsS https://your-domain.com/api/v1/health/live
curl -fsS https://your-domain.com/api/v1/health/ready
```

预期：`{"status":"ok"}` 与 `{"status":"ready"}`。

## 2. 启停

### 启动

```bash
docker compose up -d
docker compose ps
```

### 停止

```bash
docker compose stop
```

### 完全移除容器（保留数据卷）

```bash
docker compose down
```

禁止执行 `docker compose down -v`，除非确认要删除数据库卷。

### 优雅停机

entrypoint 收到 SIGTERM 后转发给 Next server，20 秒内未退出则 SIGKILL。`docker compose stop` 默认 10 秒，如遇长请求：

```bash
docker compose stop -t 25 app
```

## 3. 日志

```bash
docker compose logs -f app
docker compose logs --since=1h app | grep '"level":"error"'
docker compose logs -f nginx
```

应用日志为结构化 JSON，常见事件：

| 事件                           | 含义                             |
| ------------------------------ | -------------------------------- |
| `comment_created`              | 评论入库                         |
| `comments_post_rejected`       | 评论被拒绝（含限流/Origin/字段） |
| `comment_moderated`            | 审核完成                         |
| `comment_deleted`              | 软删除                           |
| `admin_comment_patch_rejected` | 无 CSRF/未登录/冲突              |
| `comments_list_failed`         | 评论读取失败                     |

排查时使用 `requestId` 与 `traceId` 串联响应与日志。

## 4. 备份

```bash
docker compose exec app node scripts/backup-db.mjs
```

- 产物：`/app/data/backups/k1blog-<ISO>.db`
- 已在容器内执行 `PRAGMA integrity_check`
- 复制到宿主机：

```bash
docker compose cp app:/app/data/backups/<file>.db ./backups/
```

- 建议每日定时备份，异地保存 14–30 天。
- 备份含 IP 哈希，按敏感数据保管。

## 5. 恢复

```bash
docker compose stop app
docker compose run --rm --no-deps -v "$PWD/backups:/backup" app \
  sh -c "cp /backup/<file>.db /app/data/k1blog.db && rm -f /app/data/k1blog.db-wal /app/data/k1blog.db-shm"
docker compose start app
curl -fsS https://your-domain.com/api/v1/health/ready
```

注意：

- 恢复前确认 `app` 已停止，避免 WAL 覆盖。
- 删除 `-wal` / `-shm`，否则可能与新主文件不一致。
- 恢复后执行一次登录、策略读取与留言台账冒烟。

## 6. 管理员

### 初始化

```bash
docker compose run --rm app node scripts/bootstrap-admin.mjs
```

- 读取 `ADMIN_USERNAME` / `ADMIN_PASSWORD`；密码至少 8 位，含大小写字母与数字。
- 已存在则跳过；若邮箱已存在但尚未绑定账户，则写入 `ADMIN_USERNAME`。
- 建议初始化后从 `.env` 移除 `ADMIN_PASSWORD`。

### 重置密码

当前没有 CLI 重置命令。推荐流程：

1. 停止 app；
2. 备份数据库；
3. 使用 Better Auth 的管理 API 或临时脚本更新密码哈希；
4. 启动并验证登录；
5. 删除临时脚本与明文密码。

若无法安全操作，直接删除 `user` 与关联 `session/account` 记录后重新 bootstrap（会丢失管理员会话，不影响评论数据）。

## 7. 评论维护

```bash
docker compose exec app node scripts/purge-comments.mjs
```

删除范围：

- 30 天前 `pending/rejected/spam`；
- 30 天前已软删除且无回复；
- 180 天前审计。

执行前先备份。该命令物理删除，不可回滚。

### 垃圾评论突增

1. 查看 `pending`/`spam` 数量与来源；
2. 临时降低 Nginx `k1api` 限额或封禁 IP 段；
3. 在管理端批量标记垃圾；
4. 保留审计，不要直接改库；
5. 评估是否需要验证码/更严格启发式。

## 8. 迁移

```bash
pnpm db:backup
docker compose build --build-arg SITE_URL=https://your-domain.com
docker compose up -d
docker compose logs app | head -n 30
```

- 迁移由 entrypoint 自动执行。
- 失败时容器退出，不启动 server。
- 破坏性迁移必须先备份并准备回滚。

## 9. 发布与回滚

### 发布

```bash
git pull
pnpm db:backup
docker compose build --build-arg SITE_URL=https://your-domain.com
docker compose up -d
curl -fsS https://your-domain.com/api/v1/health/ready
```

### 回滚

```bash
docker compose down
git checkout <上一个稳定提交>
docker compose build --build-arg SITE_URL=https://your-domain.com
docker compose up -d
```

如迁移不兼容：

```bash
docker compose stop app
# 恢复备份（见第 5 节）
docker compose start app
```

## 10. 事故处理

### 10.1 站点 502 / 504

1. `docker compose ps`：app 是否 healthy。
2. `docker compose logs --tail=100 app`：启动失败、迁移失败、端口占用。
3. `docker compose exec nginx nginx -t`：配置是否合法。
4. 检查 Nginx upstream 是否为 `app:3000`。
5. 重启 app；仍失败则回滚。

### 10.2 `ready` 返回 503

1. 检查数据卷是否挂载：`docker compose exec app ls -l /app/data`。
2. 检查权限：容器用户 `k1` 是否可写。
3. 检查磁盘：`df -h`。
4. 检查迁移日志。
5. 如数据库损坏：停止、备份当前文件、恢复最近备份。

### 10.3 SQLite `database is locked`

- 确认没有第二个 app 容器或脚本同时写库。
- 检查长事务/备份进程。
- 不要删除 `-wal`；先停止写入，等待 checkpoint。
- 必要时停机、备份、重启。

### 10.4 磁盘满

1. `df -h`、`du -sh /var/lib/docker/volumes/*`。
2. 清理旧备份与日志。
3. `comments:purge` 释放空间（先备份）。
4. 扩容磁盘或迁移数据卷。

### 10.5 证书过期

1. 替换 `deploy/certs/fullchain.pem` 与 `privkey.pem`。
2. `docker compose exec nginx nginx -t`。
3. `docker compose exec nginx nginx -s reload`。
4. `curl -vI https://your-domain.com/` 验证证书链。

### 10.6 评论 POST 403

- 检查 `SITE_URL` 与浏览器 Origin 是否完全一致（协议、域名、端口）。
- 检查反向代理是否改写了 `Host` / `X-Forwarded-Proto`。
- 本地切换端口/域名后必须同步修改 `SITE_URL`。

### 10.7 管理端 401/403

- 401：会话过期或 Cookie 未携带；重新登录。
- 403 + `K1-AUTH-003`：CSRF 缺失/失效；刷新管理页获取新 token。
- 403 + `K1-AUTH-002`：权限不足（当前单管理员不应出现）。
- 409 `K1-ADM-001`：状态被其他会话改变；刷新列表重试。

### 10.8 字体回退/标题变味

- 新增标题后未执行 `pnpm fonts:build`。
- 检查 `public/fonts/noto-serif-display.woff2` 是否进入镜像。
- 检查根布局 preload 与 `font-display`。

### 10.9 密钥轮换

| 密钥                 | 影响                       | 步骤                                 |
| -------------------- | -------------------------- | ------------------------------------ |
| `BETTER_AUTH_SECRET` | 所有会话与 CSRF 失效       | 停机 → 备份 → 更换 → 启动 → 重新登录 |
| `COMMENT_IP_PEPPER`  | 历史 IP 哈希无法关联新记录 | 停机 → 备份 → 更换 → 启动            |

轮换后必须更新密码管理器与部署记录。

## 11. 维护周期

| 周期     | 动作                                            |
| -------- | ----------------------------------------------- |
| 每日     | 自动备份；检查健康检查与错误日志                |
| 每周     | 检查磁盘、评论待审数量、Nginx 错误日志          |
| 每月     | `pnpm audit --prod`、依赖更新评估、备份恢复抽样 |
| 每季度   | 完整恢复演练、证书/域名检查、密钥与权限复核     |
| 每次发布 | 备份、构建、健康检查、评论全链路冒烟、回滚预案  |

## 12. 发布记录模板

```text
日期：
版本/提交：
变更摘要：
迁移：
备份文件：
验证命令与结果：
Lighthouse：
已知风险：
回滚点：
操作人：
```
