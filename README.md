# K1Blog

> 一个关于技术、设计与时间的个人博客。低照度、克制、以文字为中心。
>
> 这不是模板博客，也不是演示页。视觉、交互、内容、工程与运维都按同一套标准交付。

## 1. 项目简介

K1Blog 是一个以长文阅读为核心的自托管博客系统，包含：

- 深色 / 浅色双主题视觉系统，无阴影、无渐变、无发光；
- 满屏首页展示场：右侧胶囊导航、Canvas 指针场、坐标读数与鼠标联动，不渲染文章列表；
- MDX 内容管线、构建期检索索引、RSS、Sitemap、分享图；
- 原生留言系统：策略驱动自动审核、即时发布、人工兜底、审计、CSRF、幂等、限流、蜜罐、IP 哈希；
- Better Auth 管理员认证与留言自动化控制台；
- SQLite（WAL）+ Drizzle ORM，单实例自托管；
- Next.js standalone + Docker + Nginx 反向代理。

设计方向与执行标准见 [`docs/`](./docs/README.md)，实现说明见本文档末尾的文档索引。

## 2. 技术栈

| 层   | 实现                                                                 |
| ---- | -------------------------------------------------------------------- |
| 框架 | Next.js 16.4.3 App Router、React 19.3.1、TypeScript 5.9.3 strict     |
| 样式 | Tailwind CSS 4.3.3 + 自建设计 token（`styles/tokens.css`）           |
| 内容 | 仓库内 MDX、`next-mdx-remote-client`、Shiki、rehype-pretty-code      |
| 搜索 | Orama 3.1.18 + Mandarin tokenizer（构建期生成 `/search-index.json`） |
| 数据 | SQLite + better-sqlite3 13.0.3 + Drizzle ORM 0.45.4                  |
| 认证 | Better Auth 1.7.14，账户密码，管理员会话 7 天                        |
| 运行 | Node 22 LTS、pnpm 12.16.1、Next standalone                           |
| 边缘 | Nginx 1.27，TLS、HTTP/2、限流、安全头、静态缓存                      |
| 质量 | ESLint 9、Prettier、Vitest、Playwright、Lighthouse CI、axe           |

## 3. 环境要求

- Node.js **22.x**（`>= 22.0.0`，仓库提供 `.nvmrc` / `.node-version`：22.23.4）
- pnpm **12.16.1**（`corepack enable` 后由 `packageManager` 自动锁定）
- Python 3（仅重新生成展示字体子集时需要）
- Docker 与 Docker Compose（部署时）
- Nginx 由 Compose 提供；证书需部署者自备

> `better-sqlite3` 的预编译二进制不支持 Node 20，使用 Node 20 会在启动时崩溃。

## 4. 快速开始

```bash
corepack enable
pnpm install

# 1. 配置环境变量
cp .env.example .env.local

# 2. 生成密钥（写入 .env.local）
#    BETTER_AUTH_SECRET：至少 32 字符随机串
#    COMMENT_IP_PEPPER：至少 16 字符随机串

# 3. 迁移数据库并创建管理员
pnpm db:migrate
pnpm admin:bootstrap

# 4. 启动开发服务器
pnpm dev
```

打开 `http://localhost:3000`。管理端：`/admin/login`。

生成密钥的参考命令：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # BETTER_AUTH_SECRET / PEPPER
```

`.env.local` 必须包含：

| 变量                                | 说明                                                               |
| ----------------------------------- | ------------------------------------------------------------------ |
| `APP_ENV`                           | `development` / `test` / `production`                              |
| `SITE_URL`                          | 站点公开地址，用于 Origin 校验、RSS、Sitemap、认证                 |
| `TRUSTED_ORIGINS`                   | 可选，逗号分隔；额外可信来源。开发环境自动信任本机回环与局域网地址 |
| `DATABASE_PATH`                     | SQLite 路径，相对路径由启动脚本解析为绝对路径                      |
| `BETTER_AUTH_SECRET`                | 会话与 CSRF 派生密钥，至少 32 字符                                 |
| `COMMENT_IP_PEPPER`                 | IP 哈希 pepper，至少 16 字符                                       |
| `SMTP_URL` / `SMTP_FROM`            | 可选；配置后待审评论会邮件通知管理员                               |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin:bootstrap` 使用；密码至少 8 位，含大小写字母与数字          |
| `ADMIN_EMAIL`                       | 可选；管理员通知邮箱，同时作为账号的内部标识                       |

## 5. 常用命令

| 命令                   | 作用                                               |
| ---------------------- | -------------------------------------------------- |
| `pnpm dev`             | 本地开发（自动检查内容、生成搜索索引、迁移数据库） |
| `pnpm build`           | 生产构建 + standalone 资产准备                     |
| `pnpm start`           | 启动本地生产预览（standalone，读取 `.env.local`）  |
| `pnpm lint`            | ESLint                                             |
| `pnpm typecheck`       | TypeScript 严格检查                                |
| `pnpm test`            | Vitest 单元与集成测试                              |
| `pnpm test:e2e`        | Playwright 端到端（自动重建测试库并构建）          |
| `pnpm content:check`   | 校验 MDX frontmatter、slug、日期与重复             |
| `pnpm search:index`    | 重建 `/public/search-index.json`                   |
| `pnpm db:migrate`      | 执行 Drizzle 迁移                                  |
| `pnpm db:check`        | 检查数据库表与完整性                               |
| `pnpm db:backup`       | 在线备份数据库并校验完整性                         |
| `pnpm comments:purge`  | 清理 30 天前待审/拒绝/垃圾评论与旧审计             |
| `pnpm admin:bootstrap` | 创建管理员（已存在则跳过）                         |
| `pnpm fonts:build`     | 从标题与 UI 文案重新生成展示字体子集               |
| `pnpm lighthouse`      | Lighthouse CI 性能与无障碍门禁                     |
| `pnpm audit --prod`    | 生产依赖漏洞审计                                   |

Lighthouse 需要 Chrome/Chromium。若机器只有 Microsoft Edge，可指定：

```powershell
$env:CHROME_PATH = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
pnpm lighthouse
```

## 6. 目录结构

```text
app/                路由与页面（(site) 公开站、(admin) 管理端、api Route Handler）
components/         布局、仪器、内容、评论、管理端组件
features/           领域逻辑（content / comments / admin）
lib/                基础设施（db、auth、security、http、errors、logging、email）
content/posts/      MDX 文章
styles/             设计 token、字体、站点与页面样式
public/fonts/       展示字体子集、等宽字体
drizzle/            SQL 迁移
scripts/            构建、迁移、备份、清理、OG、字体、E2E 准备
tests/              unit / integration / e2e
docs/               执行标准（00–06 + ADR）
deploy/             Nginx 配置与证书目录
```

## 7. 交付验证

本地最终验证结果（2026-11-01）：

| 门禁                | 结果                                                    |
| ------------------- | ------------------------------------------------------- |
| `pnpm lint`         | 0 error                                                 |
| `pnpm typecheck`    | 通过                                                    |
| `pnpm test`         | 6 文件 / 20 项通过                                      |
| `pnpm test:e2e`     | 20 通过 / 2 按设计跳过                                  |
| Lighthouse 首页     | 性能 0.97、无障碍 1、LCP 2464ms、TBT 121ms、CLS 0.00002 |
| Lighthouse 文章页   | 性能 0.98、无障碍 1、LCP 2199ms、TBT 86ms、CLS 0.00021  |
| `pnpm audit --prod` | 无已知漏洞                                              |

## 8. 部署

```bash
cp .env.example .env   # 填写生产配置
mkdir -p deploy/certs  # 放入 fullchain.pem / privkey.pem
docker compose up -d --build
```

详见 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)。

## 9. 文档索引

执行标准（目标与约束）：

- [docs/README.md](./docs/README.md)：总览与文档地图
- [docs/00-项目执行宪法.md](./docs/00-项目执行宪法.md)
- [docs/01-入口文件与装配规范.md](./docs/01-入口文件与装配规范.md)
- [docs/02-企业级研发规范.md](./docs/02-企业级研发规范.md)
- [docs/03-通用软件工程规范.md](./docs/03-通用软件工程规范.md)
- [docs/04-视觉与交互设计系统规范.md](./docs/04-视觉与交互设计系统规范.md)
- [docs/05-内容评论与数据规范.md](./docs/05-内容评论与数据规范.md)
- [docs/06-质量门禁与交付规范.md](./docs/06-质量门禁与交付规范.md)
- [docs/adr/](./docs/adr/)：动效、字体、性能预算决策

实现文档（当前事实）：

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [API_DOC.md](./API_DOC.md) / [openapi.yaml](./openapi.yaml)
- [DB_DESIGN.md](./DB_DESIGN.md)
- [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [CONTENT_GUIDE.md](./CONTENT_GUIDE.md)
- [RUNBOOK.md](./RUNBOOK.md)

## 10. 已知限制

- Docker 与 Nginx 配置已按生产标准编写，但本机未安装 Docker/Nginx，未执行实机 `docker build` 与 `nginx -t`；上线前必须在目标主机验证。
- 生产 CSP 目前使用 `script-src 'self' 'unsafe-inline'`，nonce / `strict-dynamic` 仍为后续加固项。
- SQLite 为单实例方案；不支持多副本并发写入。水平扩展前需迁移到服务型数据库。
- 中文正文使用系统黑体，展示字体仅覆盖当前标题与 UI 字符；新增标题后必须运行 `pnpm fonts:build`。
- 邮件通知依赖 SMTP；未配置时仅写日志，不影响评论入库。
- 内容与站点文案为原创示例，投入正式运营前请替换为作者自己的文章与身份信息。
