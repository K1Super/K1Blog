# K1Blog 上线安全清单

> 版本：v1.0.0  
> 评估日期：2026-10-31  
> 范围：公开站、评论、认证、管理端、数据、边缘、部署  
> 结论：代码级检查通过；边缘与容器需在目标机复验。CSP 仍有加固项。

## 1. 状态说明

- ✅ 已实现并验证
- ◐ 已实现，但依赖部署配置或未在本机验证
- ○ 未实现 / 后续加固
- — 不适用

## 2. 身份与认证

| 项                   | 状态 | 证据 / 说明                                                                          |
| -------------------- | ---- | ------------------------------------------------------------------------------------ |
| 管理员密码使用强哈希 | ✅   | Better Auth 1.7.14 管理凭据                                                          |
| 密码最短长度         | ✅   | 8 位，且必须同时包含大写字母、小写字母和数字                                         |
| 邮箱验证关闭         | ✅   | 单管理员场景；注册入口不在公开站暴露                                                 |
| 会话有效期           | ✅   | 7 天，24 小时滚动更新                                                                |
| 会话 Cookie HttpOnly | ✅   | Better Auth 默认                                                                     |
| 会话 Cookie Secure   | ◐    | 生产必须 HTTPS；`SITE_URL` 必须是 https                                              |
| 登录失败限流         | ◐    | Nginx `k1auth` 10 r/m burst 5；应用层 `K1-AUTH-004` 预留未启用                       |
| 多因素认证           | ○    | 未启用                                                                               |
| 密码找回             | —    | 单管理员，无公开找回入口                                                             |
| 管理员注册接口暴露   | ✅   | Better Auth 默认注册路由存在但无公开 UI；生产建议在 Nginx 层限制 `/api/auth/sign-up` |
| 登出                 | ✅   | 管理端 `authClient.signOut`，清理会话                                                |

## 3. 授权与 CSRF

| 项                    | 状态 | 证据 / 说明                                    |
| --------------------- | ---- | ---------------------------------------------- |
| 管理端页面强制登录    | ✅   | `requireAdminPage()`，未登录重定向             |
| 管理端 API 强制登录   | ✅   | `requireAdminApi()`，401                       |
| 写操作 CSRF           | ✅   | `x-csrf-token`，HMAC-SHA256 派生，常量时间比较 |
| 读管理接口不要求 CSRF | ✅   | GET 仅会话校验，无副作用                       |
| 评论 Origin 校验      | ✅   | POST 必须 `Origin === SITE_URL`                |
| 越权访问他人评论      | —    | 单管理员模型，无多租户                         |
| 审核并发冲突          | ✅   | 乐观并发 + `K1-ADM-001`                        |

## 4. 输入与注入

| 项                | 状态 | 证据 / 说明                                                    |
| ----------------- | ---- | -------------------------------------------------------------- |
| 评论输入 Zod 校验 | ✅   | 昵称 1–40、正文 1–2000、父 ID UUID                             |
| 控制字符清理      | ✅   | 名称与正文过滤控制字符与零宽字符                               |
| 评论按纯文本处理  | ✅   | 前端渲染文本，不执行 HTML/MDX                                  |
| 父评论层级限制    | ✅   | 仅允许 approved 顶层评论，禁止二级回复                         |
| 蜜罐字段          | ✅   | `website` 非空直接判定 spam，不受策略开关影响                  |
| 最短填写时间      | ✅   | 低于策略阈值累积风险，按分数进入待审或拦截                     |
| 超长表单时间      | ✅   | 超过策略有效期累积风险                                         |
| 链接数量启发式    | ✅   | 超过策略上限按条累积风险                                       |
| 自动审核策略校验  | ✅   | Zod 完整策略、数值区间、阈值互斥、词表去重                     |
| 自动判定审计      | ✅   | 发布/拦截写 `moderation_audit`，全部判定写快照                 |
| 词表导入          | ✅   | 仅管理端；UTF-8 CSV/TXT、≤1MB、≤1000 项、预览后确认            |
| SQL 注入          | ✅   | Drizzle 参数化查询                                             |
| MDX 执行边界      | ✅   | 仅仓库内受控内容；评论不进入 MDX                               |
| 路径遍历          | ✅   | slug 来自受控文件与白名单路由；`dynamicParams = false`         |
| JSON 体积         | ◐    | 常规 64k；策略接口精确路径 192k，应用层同步校验 Content-Length |

## 5. 限流与滥用

| 项             | 状态 | 证据 / 说明                                           |
| -------------- | ---- | ----------------------------------------------------- |
| 评论 IP 限流   | ✅   | 5/min、20/h                                           |
| 幂等提交       | ✅   | `Idempotency-Key` HMAC 唯一索引                       |
| 边缘 API 限流  | ◐    | Nginx 60 r/m burst 20；需目标机验证                   |
| 登录限流       | ◐    | Better Auth 内置（生产启用）+ Nginx；测试环境关闭内置 |
| 分布式限流     | ○    | 进程内 Map；多实例需共享存储                          |
| 全站 DDoS 防护 | ○    | 依赖云厂商/WAF，不在代码范围                          |

## 6. 数据保护

| 项                | 状态 | 证据 / 说明                                    |
| ----------------- | ---- | ---------------------------------------------- |
| IP 哈希           | ✅   | HMAC + `COMMENT_IP_PEPPER`                     |
| UA 最小化         | ✅   | 截断 120 字符                                  |
| 公开接口不返回 IP | ✅   | `CommentDto` 仅公开昵称/正文/时间              |
| 软删除            | ✅   | `deleted_at`，公开查询过滤                     |
| 数据保留清理      | ✅   | `comments:purge`：30 天未通过/软删、180 天审计 |
| 备份完整性        | ✅   | online backup + `integrity_check`              |
| 备份加密          | ○    | 备份文件为明文 SQLite；需依赖磁盘/对象存储加密 |
| 日志脱敏          | ✅   | 日志不含 IP、评论正文                          |
| 密钥分离          | ✅   | 会话与 IP pepper 独立                          |

## 7. 传输与浏览器安全

| 项                 | 状态 | 证据 / 说明                                                              |
| ------------------ | ---- | ------------------------------------------------------------------------ |
| HTTPS/HSTS         | ◐    | 应用生产头 + Nginx HSTS；需证书与目标机验证                              |
| HTTP → HTTPS       | ◐    | Nginx 301；需实机验证                                                    |
| CSP                | ◐    | 已启用；`script-src 'self' 'unsafe-inline'`，nonce/strict-dynamic 未实现 |
| X-Frame-Options    | ✅   | `DENY`                                                                   |
| nosniff            | ✅   | 全站                                                                     |
| Referrer-Policy    | ✅   | `strict-origin-when-cross-origin`                                        |
| Permissions-Policy | ✅   | camera/mic/geo/payment 禁用                                              |
| COOP/CORP          | ✅   | same-origin                                                              |
| 生产错误不泄露堆栈 | ✅   | `errorResponse` 只返回稳定码与消息                                       |
| 安全响应头重复设置 | ◐    | Next 与 Nginx 均设置；以更严格者为准                                     |
| TLS 版本           | ◐    | Nginx 仅 TLS 1.2/1.3；需实机验证                                         |
| 证书管理           | ○    | 需部署者提供与续期                                                       |

## 8. 依赖与供应链

| 项             | 状态 | 证据 / 说明                                   |
| -------------- | ---- | --------------------------------------------- |
| 生产依赖审计   | ✅   | `pnpm audit --prod`：无已知漏洞               |
| 锁文件         | ✅   | `pnpm-lock.yaml` 提交                         |
| 构建脚本白名单 | ✅   | `pnpm-workspace.yaml` `onlyBuiltDependencies` |
| 运行时非 root  | ◐    | Dockerfile 用户 `k1`；需实机构建验证          |
| 镜像基础版本   | ✅   | `node:22-bookworm-slim`、`nginx:1.27-alpine`  |
| 镜像漏洞扫描   | ○    | 未接入 Trivy/Grype；建议发布前扫描            |
| 依赖来源       | ✅   | 官方 npm registry；pnpm 供应链策略校验        |

## 9. 部署与运维

| 项                 | 状态 | 证据 / 说明                                             |
| ------------------ | ---- | ------------------------------------------------------- |
| 环境变量校验       | ✅   | entrypoint 校验必需变量、密钥长度、base64 32 字节       |
| 迁移失败阻断启动   | ✅   | entrypoint 迁移失败退出                                 |
| 健康检查           | ✅   | live/ready，Docker healthcheck                          |
| 优雅停机           | ✅   | SIGTERM 转发，20 秒强杀                                 |
| 容器内管理员初始化 | ✅   | `scripts/bootstrap-admin.mjs`（构建期打包，已本地验证） |
| 数据卷持久化       | ◐    | `k1data`；需目标机验证                                  |
| Nginx 配置语法     | ○    | 本机无 Nginx，未执行 `nginx -t`                         |
| Docker 构建        | ○    | 本机无 Docker，未执行 `docker build`                    |
| `.env` 权限        | ○    | 部署时设置 `600`                                        |
| 防火墙/端口        | ○    | 部署时配置                                              |
| 备份异地保存       | ○    | 运维策略                                                |
| 监控与告警         | ○    | 当前只有结构化日志与健康检查                            |

## 10. 已识别风险

| 风险                     | 级别 | 处置                                                                    |
| ------------------------ | ---- | ----------------------------------------------------------------------- |
| CSP 允许 `unsafe-inline` | 中   | 后续改为 nonce + `strict-dynamic`；需处理 Next 内联脚本与主题初始化脚本 |
| 进程内限流可被重启绕过   | 低   | 单实例可接受；多实例前替换                                              |
| 登录应用层限流未启用     | 低   | 依赖 Nginx；可在 Better Auth 层增加                                     |
| 备份未加密               | 中   | 依赖宿主磁盘加密与访问控制；后续可加密备份                              |
| Better Auth 注册路由     | 中   | 单管理员场景建议 Nginx 拒绝 `/api/auth/sign-up*`；上线检查项            |
| Docker/Nginx 未实机验证  | 高   | 目标机必须执行构建、`nginx -t`、HTTPS 与健康检查                        |
| 无 MFA                   | 低   | 单管理员强密码 + 限流；后续可加 TOTP                                    |
| SMTP 未强制 TLS          | 低   | 使用 `smtps://` 或 STARTTLS 的 SMTP URL                                 |

## 11. 上线前必须完成的动作

1. 生成三套独立随机密钥，写入 `.env`，权限 `600`。
2. 将 `SITE_URL` 设为真实 HTTPS 地址。
3. 在 Nginx 层拒绝 `POST /api/auth/sign-up*`（单管理员场景）。
4. 配置证书，执行 `nginx -t`，验证 HSTS/CSP/HTTP2。
5. 在目标机执行 `docker build`、`docker compose up`、健康检查、评论全链路。
6. 执行 `docker compose run --rm app node scripts/bootstrap-admin.mjs` 创建管理员，并移除 `.env` 中的 `ADMIN_PASSWORD`。
7. 执行一次 `db:backup` 与恢复演练。
8. 接入镜像漏洞扫描与基础监控（可用云厂商或自建）。
9. 验证 SMTP 通知（如启用）。
10. 记录本次验证的命令、输出与截图，归档到发布记录。

## 12. 复核命令

```bash
pnpm audit --prod
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm lighthouse
curl -fsSI https://your-domain.com/ | head -n 30
curl -fsS https://your-domain.com/api/v1/health/ready
docker compose exec nginx nginx -t
```
