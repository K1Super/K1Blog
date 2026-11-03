# K1Blog 系统架构

> 版本：v1.1.0  
> 对应实现：K1Blog v0.1.0（2026-11-02）  
> 上游：`docs/03-通用软件工程规范.md`、`docs/01-入口文件与装配规范.md`

## 1. 架构目标

- 单人可维护：部署、备份、恢复、排障都可以由一个人完成。
- 读多写少：公开页面优先静态化，评论与管理端是唯一的动态写路径。
- 失败可解释：错误有稳定 `K1-*` 码、请求有 traceId、审核有审计。
- 边界清晰：内容、评论、认证、安全、数据各自成域，UI 不直接碰数据库。
- 可替换：SQLite、Nginx、SMTP、字体均可独立替换，不把基础设施写死进业务代码。

## 2. 运行时拓扑

```text
Browser
  │  HTTPS
  ▼
Nginx 1.27（TLS / HTTP/2 / 限流 / 安全头 / 静态缓存）
  │  HTTP 1.1 keepalive
  ▼
Next.js standalone server（Node 22，非 root，端口 3000）
  ├─ App Router 页面（SSG / RSC）
  ├─ Route Handler（评论、管理端、认证、健康检查）
  ├─ Better Auth（账户密码会话）
  └─ SQLite（WAL，命名卷 k1data）
       └─ data/k1blog.db
```

本地开发不经过 Nginx，直接访问 `http://localhost:3000`；`SITE_URL` 必须与访问源一致，否则评论 POST 的 Origin 校验会拒绝。

## 3. 分层

| 层        | 目录             | 职责                                     | 禁止                                  |
| --------- | ---------------- | ---------------------------------------- | ------------------------------------- |
| 路由/页面 | `app/`           | 路由、metadata、页面装配、HTTP 入口      | 直接写 SQL、直接拼加密逻辑            |
| 组件      | `components/`    | 展示与交互，客户端岛屿                   | 引用服务端 `lib/auth`、直接访问数据库 |
| 领域      | `features/`      | 内容读取、评论用例、管理端用例、输入校验 | 依赖 React / 页面状态                 |
| 基础设施  | `lib/`           | DB、认证、加密、限流、日志、HTTP、邮件   | 承载业务规则                          |
| 内容      | `content/posts/` | MDX 与 frontmatter                       | 执行任意外部代码                      |
| 样式      | `styles/`        | token、字体、站点与页面样式              | 组件内裸 hex、渐变、发光              |
| 脚本      | `scripts/`       | 迁移、备份、清理、索引、构建准备         | 进入运行时请求路径（entrypoint 除外） |

依赖方向：`app → features → lib`；`components → features（仅类型/纯函数）`；`lib` 不反向依赖 `features`。ESLint 边界规则阻止组件引用服务端认证模块。

## 4. 页面与路由

| 路径              | 类型               | 说明                                                |
| ----------------- | ------------------ | --------------------------------------------------- |
| `/`               | SSG                | Hero、最新文章、文章列表                            |
| `/posts/[slug]`   | SSG                | 文章、目录、相关文章、评论；`dynamicParams = false` |
| `/archive`        | SSG                | 按年/月分组的全部文章                               |
| `/tags/[tag]`     | SSG                | 标签下的文章列表                                    |
| `/search`         | SSG + 客户端       | 客户端加载 Orama 索引搜索                           |
| `/about`          | SSG                | 站点自述                                            |
| `/feed.xml`       | 静态 Route Handler | RSS 2.0                                             |
| `/sitemap.xml`    | 元数据路由         | 页面、文章、标签                                    |
| `/robots.txt`     | 元数据路由         | 禁止 `/admin`、`/api`                               |
| `/admin/login`    | 动态               | 管理员登录                                          |
| `/admin/comments` | 动态               | 留言自动化控制台与台账，必须登录                    |
| `/admin`          | 重定向             | 跳转 `/admin/comments`                              |
| `not-found`       | 静态               | 页面不存在语言                                      |

## 5. 内容管线

```text
content/posts/*.mdx
  │ gray-matter 解析 frontmatter
  │ Zod 校验（title/slug/description/date/status/tags/...）
  │ 文件名 slug 与 frontmatter slug 一致性检查
  │ 阅读时长与字数计算
  ▼
features/content/loader.ts（进程内只读缓存语义：每次重新读取并排序）
  ├─ 首页文章列表
  ├─ 文章页 SSG（generateStaticParams）
  ├─ 归档 / 标签 / 相关文章
  ├─ RSS / Sitemap
  └─ scripts/build-search-index.ts → public/search-index.json → Orama
```

- 只发布 `status: published`；草稿不会进入构建页面。
- 构建前 `prebuild` 依次执行内容检查与索引生成，内容失败会阻断构建。
- MDX 渲染使用 `next-mdx-remote-client`，插件为 `remark-gfm` 与 `rehype-pretty-code`；标题自动生成稳定 id。
- 文章正文、标题与 UI 字符会进入展示字体子集；新增标题后必须 `pnpm fonts:build`。

## 6. 评论链路

### 6.1 公开读取

```text
GET /api/v1/posts/[slug]/comments?limit&cursor
  → 校验文章存在
  → 查询 approved + 未删除 + 顶层评论
  → 按 createdAt/id 游标分页
  → 附加这些顶层评论的 approved 回复（最多 200）
  → { data: { items, nextCursor } }
```

### 6.2 公开提交

```text
POST /api/v1/posts/[slug]/comments
  Origin 校验（必须等于 SITE_URL）
  → JSON 解析
  → Zod 校验字段
  → 必须提供 Idempotency-Key
  → IP 限流（5/min、20/h）
  → 文章存在校验
  → 幂等哈希命中则返回原记录
  → 父评论校验（必须是 approved 顶层评论）
  → 控制字符清理
  → 读取最新策略修订
  → 收集同 IP 与重复内容上下文
  → 规则引擎计算风险分与原因
  → 低风险 approved / 边界 pending / 高风险 rejected|spam（同一事务）
  → 写 comment_moderation 与 moderation_audit
  → 202 { data: { id, status: approved|pending } }
```

- 低风险评论即时公开；边界风险进入待审；高风险按策略拦截。
- 自动审核关闭时，除蜜罐命中外全部进入待审。
- 留言只收集昵称与正文，入库时不写入任何联系方式。
- IP 只保存带 pepper 的哈希；UA 截断到 120 字符。

### 6.3 管理端

```text
GET /api/v1/admin/comments?status&page&pageSize
  → Better Auth 会话校验
  → 按状态分页列出，附带自动判定动作、风险分、原因与策略修订

PATCH /api/v1/admin/comments/[id]
  → 会话 + CSRF（x-csrf-token）
  → 人工状态流转 approved / rejected / spam
  → 乐观并发：仅当状态未变时更新
  → 写入 moderation_audit

DELETE /api/v1/admin/comments/[id]
  → 会话 + CSRF
  → 软删除（deleted_at）
  → 写入审计

GET /api/v1/admin/moderation/policy
  → 会话校验
  → 返回最新策略修订快照

PUT /api/v1/admin/moderation/policy
  → 会话 + CSRF
  → Zod 校验完整策略
  → 同一事务：追加修订、复核存量待审、写入自动判定与审计
  → 返回修订号与复核计数
```

CSRF token 由 `HMAC-SHA256('csrf:' + session.token, BETTER_AUTH_SECRET)` 派生，管理端页面渲染时下发，写请求必须携带。自动审核引擎是确定性规则实现，不调用外部模型或网络服务。

## 7. 认证

- Better Auth + Drizzle adapter，账户密码登录（用户名插件），会话有效期 7 天。
- 认证路由由 `app/api/auth/[...all]/route.ts` 交给 Better Auth。
- 服务端页面通过 `getSession()`；API 通过 `getSessionFromHeaders(request.headers)`。
- 管理员登录页不渲染管理入口与退出按钮；登录后管理端导航显示“留言自动化 / 返回站点 / 退出”。
- 登录限流由 Nginx `k1auth` 区（10 r/m，burst 5）承担；应用层错误码预留 `K1-AUTH-004`。

## 8. 搜索

- 构建期 `scripts/build-search-index.ts` 输出 `{ title, description, tags, slug, publishedAt, readingMinutes }` 数组到 `public/search-index.json`。
- 客户端 `SearchClient` 在首次打开搜索页时加载索引，使用 Orama `create` + Mandarin tokenizer，搜索 title/description/tags，限制 20 条。
- 索引为空或请求失败时显示“索引暂不可用”，不阻塞页面其他部分。

## 9. 安全与可观测

| 机制        | 实现位置                                                    |
| ----------- | ----------------------------------------------------------- |
| 安全响应头  | `next.config.ts`（全站）；`deploy/nginx.conf`（边缘）       |
| CSP         | 生产启用；当前 `script-src 'self' 'unsafe-inline'`          |
| Origin 校验 | `lib/http/request.ts`，评论 POST                            |
| CSRF        | `lib/security/csrf.ts`，管理端写请求                        |
| 限流        | `lib/rate-limit.ts`（进程内）+ Nginx 边缘限流               |
| 加密        | `lib/security/crypto.ts`（AES-256-GCM、HMAC、常量时间比较） |
| 错误契约    | `lib/errors/*`，RFC 9457 + `K1-*` 码 + traceId              |
| 日志        | `lib/logging/logger.ts`，结构化 JSON，请求级事件            |
| 健康检查    | `/api/v1/health/live`、`/api/v1/health/ready`               |

进程内限流是单实例内存实现，重启后清零；多实例部署前必须替换为共享存储或完全依赖 Nginx。

## 10. 性能设计

- 首页、文章、归档、标签为 SSG；评论为客户端异步读取，不阻塞首屏。
- 展示字体子集 + 系统中文黑体正文；根布局 preload 1 个展示字体文件；`font-display: optional` 控制 LCP。
- 首页无可见巨型标题，首屏文字以 400ms 阶梯揭示；减少动效时内容首帧完整可见。
- 首屏 JS 实测约 165KB；预算目标 160KB、门禁 180KB，记录于 ADR-0003。
- Nginx 对 `/_next/static/` 与 `/fonts/` 设置 1 年缓存。
- 单图预算 ≤ 200KB，Next 图片启用 AVIF/WebP。

## 11. 数据与部署

- SQLite 单文件，WAL 模式，`busy_timeout=5000`，外键开启。
- Docker 命名卷 `k1data` 挂载 `/app/data`；容器内非 root 用户 `k1`。
- 容器启动由 `scripts/entrypoint.mjs` 先校验环境、执行迁移，再以子进程启动 `server.js`；收到 SIGTERM 先转发，20 秒后强杀。
- 备份使用 SQLite online backup API 并执行 `integrity_check`，产物在 `data/backups/`。

## 12. 关键决策

| 决策                                    | 记录                                      |
| --------------------------------------- | ----------------------------------------- |
| 动效 CSS-first，暂缓 Motion/GSAP        | `docs/adr/ADR-0001-css-first-motion.md`   |
| 展示字体子集 + 系统中文正文             | `docs/adr/ADR-0002-font-performance.md`   |
| LCP 2.5s 目标 / 2.8s 门禁，JS 160/180KB | `docs/adr/ADR-0003-performance-budget.md` |
| SQLite 单实例                           | 本文件与 `DB_DESIGN.md`                   |
| 原生评论而非第三方                      | `docs/05-内容评论与数据规范.md`           |

## 13. 扩展边界

- 新增页面：`app/(site)/...`，数据只通过 `features/content`。
- 新增写接口：Route Handler → `features/*` → `lib`；必须定义错误码、限流、CSRF/Origin 策略与测试。
- 新增数据表：更新 `lib/db/schema.ts`、生成迁移、更新 `DB_DESIGN.md`、补充备份/恢复验证。
- 更换数据库：替换 `lib/db/client-core.ts`、Drizzle 方言与迁移目录；业务层不感知。
- 多实例：必须先解决 SQLite 写并发与进程内限流；Nginx upstream 才能扩展。
