# K1Blog 部署指南

> 版本：v1.0.0  
> 目标：单机 Docker Compose + Nginx，SQLite 持久化  
> 状态：配置已完成；本机未安装 Docker/Nginx，未做目标机实机验证

## 1. 部署拓扑

```text
Internet
  │ 80/443
  ▼
nginx:1.27-alpine（TLS、HTTP/2、限流、安全头）
  │ app:3000
  ▼
k1blog 容器（Node 22，standalone，非 root k1）
  │ /app/data
  ▼
命名卷 k1data（SQLite WAL）
```

## 2. 前置条件

- Linux 服务器，建议 2 vCPU / 2GB 内存起
- Docker 24+ 与 Docker Compose v2
- 域名与 DNS 解析
- TLS 证书：`fullchain.pem`、`privkey.pem`
- 可用端口：80、443
- 出站：SMTP（如启用邮件通知）、镜像拉取

## 3. 生产配置

```bash
git clone <repo> /srv/k1blog
cd /srv/k1blog
cp .env.example .env
mkdir -p deploy/certs
# 放入证书
cp /path/fullchain.pem deploy/certs/fullchain.pem
cp /path/privkey.pem deploy/certs/privkey.pem
```

`.env` 至少包含：

```dotenv
APP_ENV=production
SITE_URL=https://your-domain.com
TRUSTED_ORIGINS=
DATABASE_PATH=/app/data/k1blog.db
BETTER_AUTH_SECRET=<至少32字符随机串>
COMMENT_IP_PEPPER=<至少16字符随机串>
SMTP_URL=
SMTP_FROM=
ADMIN_EMAIL=<管理员通知邮箱，可选>
ADMIN_USERNAME=<管理员账户>
ADMIN_PASSWORD=<至少8位，含大小写字母与数字>
```

规则：

- `SITE_URL` 必须与真实访问地址完全一致（含协议、域名、端口）；否则评论 POST 与管理端登录的 Origin 校验会拒绝。
- 如必须同时通过多个域名访问（例如主域 + 备用域），把它们以逗号分隔写入 `TRUSTED_ORIGINS`；生产环境不会自动信任回环或局域网地址。
- 两个密钥必须使用密码学随机源生成，不得复用其他系统密钥。
- `.env` 权限建议 `600`，不得提交到 Git。
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` 用于首次 `admin:bootstrap`；密码至少 8 位，且需包含大写字母、小写字母和数字。上线后可从 `.env` 移除 `ADMIN_PASSWORD`，但需保留管理员密码在密码管理器中。

生成密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # BETTER_AUTH_SECRET / COMMENT_IP_PEPPER
```

## 4. Nginx 域名

`deploy/nginx.conf` 当前 `server_name _`，证书路径固定。生产至少修改：

```nginx
server {
  listen 443 ssl;
  http2 on;
  server_name your-domain.com;

  ssl_certificate /etc/nginx/certs/fullchain.pem;
  ssl_certificate_key /etc/nginx/certs/privkey.pem;
  ...
}
```

并确认 80 端口跳转 HTTPS 的 `server_name` 与实际域名一致。修改后必须执行：

```bash
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

当前边缘策略：

- TLS 1.2 / 1.3，HSTS 2 年
- HTTP/2
- `/api/auth/` 限流 10 r/m，burst 5
- `/api/` 限流 60 r/m，burst 20
- `client_max_body_size 64k`；仅 `/api/v1/admin/moderation/policy` 精确路径提升到 192k，用于 1000 项词表
- `/_next/static/`、`/fonts/` 缓存 1 年
- 安全响应头：nosniff、DENY、Referrer-Policy、Permissions-Policy、COOP/CORP、HSTS

## 5. 构建与启动

```bash
docker compose build --build-arg SITE_URL=https://your-domain.com
docker compose up -d
docker compose ps
```

说明：

- 构建阶段只需占位密钥用于 `next build`；运行时密钥由 `.env` 注入。
- 容器入口 `scripts/entrypoint.mjs` 会校验必需环境变量、执行迁移，然后启动 `server.js`。
- 迁移失败时容器退出，不会带病启动。
- 数据卷 `k1data` 挂载到 `/app/data`；删除容器不会删除数据。

首次创建管理员：

```bash
docker compose run --rm app node scripts/bootstrap-admin.mjs
```

该命令复用同一数据卷，entrypoint 会先执行迁移，再运行 bootstrap 脚本；已存在管理员时脚本会安全跳过。管理员凭据来自 `.env` 的 `ADMIN_USERNAME` / `ADMIN_PASSWORD`。创建完成后建议从 `.env` 移除 `ADMIN_PASSWORD` 并妥善保管。

## 6. 上线检查

```bash
curl -fsS https://your-domain.com/api/v1/health/live
curl -fsS https://your-domain.com/api/v1/health/ready
curl -fsSI https://your-domain.com/ | head -n 20
curl -fsS https://your-domain.com/feed.xml | head
```

通过标准：

- `live` 返回 200；`ready` 返回 200
- 响应头包含 HSTS、CSP、X-Frame-Options、nosniff
- 首页、文章页、`/archive`、`/search`、`/about` 可访问
- `/admin/login` 可访问，未登录时只显示“返回站点”
- 提交一条测试评论返回 202，管理端可审核通过
- 评论请求体超过 64k 被 Nginx 拒绝；管理端策略接口超过 192k 被拒绝

## 7. 更新发布

```bash
cd /srv/k1blog
git pull
pnpm db:backup        # 或 docker compose exec app node scripts/backup-db.mjs
docker compose build --build-arg SITE_URL=https://your-domain.com
docker compose up -d
docker compose ps
curl -fsS https://your-domain.com/api/v1/health/ready
```

- 迁移在容器启动时自动执行。
- 发布顺序：备份 → 构建 → 滚动重启（当前单实例，会有秒级中断）→ 健康检查。
- 若迁移失败，容器会退出；先恢复备份，再回滚镜像。

## 8. 回滚

```bash
# 回滚应用镜像
docker compose down
git checkout <上一个稳定提交>
docker compose build --build-arg SITE_URL=https://your-domain.com
docker compose up -d

# 如迁移已改变数据结构且不兼容，恢复备份
docker compose stop app
docker compose run --rm --no-deps -v "$PWD/backups:/backup" app \
  sh -c "cp /backup/k1blog-<ISO>.db /app/data/k1blog.db && rm -f /app/data/k1blog.db-wal /app/data/k1blog.db-shm"
docker compose start app
```

回滚前必须确认迁移是否可逆。破坏性迁移不得只依赖“代码回滚”。

## 9. 非 Docker 部署（备选）

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

- 需要自行用 systemd/supervisor 守护，并设置 `APP_ENV=production`、`SITE_URL`、`DATABASE_PATH`。
- `pnpm start` 使用 `scripts/start-local.mjs`，不执行迁移与入口校验；生产建议直接运行 `node scripts/entrypoint.mjs`。
- Nginx 配置可复用 `deploy/nginx.conf`，将 `upstream` 改为 `127.0.0.1:3000`。
- 必须使用非 root 用户运行，并确保数据目录可写。

## 10. 备份与恢复

```bash
pnpm db:backup
# 或
docker compose exec app node scripts/backup-db.mjs
```

产物在 `data/backups/k1blog-<ISO>.db`，并已执行 `PRAGMA integrity_check`。建议：

- 每日自动备份，保留 14–30 天；
- 备份文件异地保存；
- 每季度做一次恢复演练；
- 备份包含 IP 哈希，按敏感数据管理。

恢复步骤见 `DB_DESIGN.md` 第 8 节。

## 11. 管理员初始化

推荐在镜像构建完成后、首次启动前后执行：

```bash
# 容器内（复用数据卷；entrypoint 先迁移，再运行 bootstrap）
docker compose run --rm app node scripts/bootstrap-admin.mjs

# 或在构建机（Node 22 + pnpm，连接同一个 DATABASE_PATH）
pnpm admin:bootstrap
```

- 脚本读取 `ADMIN_USERNAME` / `ADMIN_PASSWORD`，密码至少 8 位，且需同时包含大写字母、小写字母和数字。
- `ADMIN_EMAIL` 可选：用于管理员通知邮件，并在创建账号时作为内部邮箱标识。
- 管理员已存在时脚本输出 `admin already exists` 并以 0 退出。
- 生产密码必须使用密码管理器生成并保存；不要复用 `.env.local` 的开发密码。
- 若使用外部数据库或非 Compose 部署，把 `DATABASE_PATH` 指向目标库后执行 `pnpm admin:bootstrap` 即可。

## 12. 常见问题

| 现象                     | 排查                                                                |
| ------------------------ | ------------------------------------------------------------------- |
| 容器启动即退出           | `docker compose logs app`；检查环境变量校验、迁移错误、数据目录权限 |
| `ready` 503              | 数据库文件不可写、目录权限、卷未挂载、迁移失败                      |
| 评论 POST 403            | `Origin` 与 `SITE_URL` 不一致；检查反向代理是否改写 Host/协议       |
| 管理端 401/403           | 会话过期、Cookie 未携带、CSRF 头缺失                                |
| 502/504                  | app 未 healthy、Nginx upstream 地址错误、容器重启中                 |
| 字体回退                 | 新增标题后未执行 `pnpm fonts:build`，或 `public/fonts` 未进入镜像   |
| 图片/静态资源 404        | standalone 资产未复制；检查 `prepare-standalone.mjs` 与 Docker COPY |
| Lighthouse 找不到 Chrome | 安装 Chromium，或设置 `CHROME_PATH` 指向 Edge/Chromium              |

## 13. 未验证项

以下必须在目标机执行并留存证据：

- `docker build` 与 `docker compose up`
- `nginx -t` 与 HTTPS 实际握手
- 证书链、HSTS、CSP 在真实域名下的表现
- SMTP 通知实际投递
- 备份文件在目标机的恢复演练
- 80/443 防火墙与 DNS 解析
