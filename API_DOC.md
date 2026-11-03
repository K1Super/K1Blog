# K1Blog API 契约

> 版本：v1.1.0  
> 机器可读契约：[openapi.yaml](./openapi.yaml)  
> 适用：评论公开接口、管理端自动审核与留言接口、认证、健康检查

## 1. 通用约定

- 基础路径：`/api/v1`
- 成功响应：`{ "data": ... }`；分页列表额外带 `meta`
- 错误响应：`application/problem+json`，字段为 `type/title/status/detail/instance/code/traceId`，字段校验失败时附 `errors[]`
- 所有响应带 `X-Request-Id`；写接口 `Cache-Control: no-store`
- 时间：ISO 8601 UTC 字符串
- 文本：UTF-8；评论正文按纯文本存储，不解析 HTML
- 稳定错误码：`K1-*`，见第 7 节

## 2. 认证

| 场景         | 机制                                         |
| ------------ | -------------------------------------------- |
| 管理员页面   | Better Auth 会话 Cookie，登录后 7 天有效     |
| 管理端 API   | 同上 Cookie；写操作额外要求 `x-csrf-token`   |
| 公开评论读取 | 无认证                                       |
| 公开评论提交 | 无认证；要求 `Origin` 与站点 `SITE_URL` 一致 |

### 2.1 登录

```http
POST /api/auth/sign-in/username
Content-Type: application/json

{ "username": "k1super", "password": "..." }
```

该路径由 Better Auth 处理，成功时下发会话 Cookie。登出使用 `POST /api/auth/sign-out`。具体字段以 Better Auth 1.7.14 为准；前端使用 `lib/auth-client.ts` 的 `authClient.signIn.username` / `authClient.signOut`。

### 2.2 CSRF

管理端页面渲染时由 `requireAdminPage()` 派生 CSRF token，管理组件将其放入 `x-csrf-token`。token 由 `HMAC-SHA256('csrf:' + session.token, BETTER_AUTH_SECRET)` 计算，不由客户端自行生成。

## 3. 健康检查

### GET /api/v1/health/live

- 作用：进程存活
- 响应：`200 { "status": "ok" }`
- 缓存：`no-store`

### GET /api/v1/health/ready

- 作用：数据库可读
- 响应：`200 { "status": "ready" }` 或 `503 { "status": "unavailable" }`

## 4. 公开评论

### GET /api/v1/posts/{slug}/comments

查询参数：

| 参数     | 类型    | 默认 | 约束                      |
| -------- | ------- | ---- | ------------------------- |
| `limit`  | integer | 20   | 1–50                      |
| `cursor` | string  | 无   | 上一页返回的 `nextCursor` |

响应：

```json
{
  "data": {
    "items": [
      {
        "id": "0192...",
        "parentId": null,
        "authorName": "读者",
        "content": "评论正文",
        "createdAt": "2026-10-31T08:00:00.000Z"
      }
    ],
    "nextCursor": "MTc2..."
  }
}
```

规则：

- 只返回 `approved` 且未软删除的评论。
- 顶层评论分页；每条顶层评论的已通过回复一并返回（最多 200 条）。
- 文章不存在返回 `K1-CMT-001`。
- 游标非法返回 `K1-REQ-002`。

### POST /api/v1/posts/{slug}/comments

请求头：

| 头                              | 必填     | 说明                                    |
| ------------------------------- | -------- | --------------------------------------- |
| `Content-Type`                  | 是       | `application/json`                      |
| `Origin`                        | 是       | 必须等于服务端 `SITE_URL`               |
| `Idempotency-Key`               | 是       | 16–64 字符；同一 key 重复提交返回原记录 |
| `X-Forwarded-For` / `X-Real-IP` | 生产建议 | 由 Nginx 传递，用于限流与 IP 哈希       |

请求体：

```json
{
  "authorName": "读者",
  "content": "一条留言。",
  "parentId": "0192...",
  "website": "",
  "formStartedAt": 1761897600000
}
```

字段规则：

| 字段            | 约束                              |
| --------------- | --------------------------------- |
| `authorName`    | 1–40 字符，去除控制字符           |
| `content`       | 1–2000 字符，纯文本               |
| `parentId`      | 可选 UUID；必须是已通过的顶层留言 |
| `website`       | 蜜罐字段，正常用户必须为空        |
| `formStartedAt` | 必填正整数，毫秒时间戳            |

响应 `202`：

```json
{ "data": { "id": "0192...", "status": "approved" } }
```

`status` 只返回 `approved` 或 `pending`：

- `approved`：自动审核通过，立即可见；
- `pending`：待审，或被拦截但按通用成功响应处理，不公开拦截分类。

提交成功不等于一定公开可见。

失败路径：

| 情况            | 码           | HTTP |
| --------------- | ------------ | ---- |
| Origin 不允许   | `K1-SEC-001` | 403  |
| JSON 非法       | `K1-REQ-001` | 400  |
| 缺少/非法幂等键 | `K1-REQ-002` | 400  |
| 字段非法        | `K1-CMT-003` | 422  |
| 父评论非法      | `K1-CMT-004` | 422  |
| 限流            | `K1-CMT-007` | 429  |
| 文章不存在      | `K1-CMT-001` | 404  |

限流：5 次/分钟/IP、20 次/小时/IP。响应不暴露剩余配额。

## 5. 管理端评论

所有管理端接口都需要会话 Cookie。写接口额外需要 `x-csrf-token`。

### GET /api/v1/admin/comments

查询参数：

| 参数       | 类型    | 默认  | 约束                                 |
| ---------- | ------- | ----- | ------------------------------------ |
| `status`   | enum    | `all` | `all/pending/approved/rejected/spam` |
| `page`     | integer | 1     | ≥1，上限 1000                        |
| `pageSize` | integer | 20    | 1–50                                 |

响应：

```json
{
  "data": {
    "items": [
      {
        "id": "0192...",
        "parentId": null,
        "authorName": "读者",
        "content": "评论正文",
        "createdAt": "2026-10-31T08:00:00.000Z",
        "postSlug": "about",
        "status": "pending",
        "moderatedAt": null,
        "moderatedBy": null,
        "moderationNote": null,
        "automation": {
          "action": "pending",
          "score": 45,
          "reasons": [{ "code": "banned_keyword", "label": "违禁词命中", "weight": 45 }],
          "policyRevision": 3,
          "evaluatedAt": "2026-10-31T08:00:00.000Z"
        }
      }
    ]
  },
  "meta": { "page": 1, "pageSize": 20, "total": 3 }
}
```

### PATCH /api/v1/admin/comments/{id}

请求头：`x-csrf-token` 必填。

```json
{ "status": "approved", "note": "通过" }
```

- `status` 只能是 `approved` / `rejected` / `spam`；`note` 可选，≤500。
- 状态未变时直接返回当前状态，不写审计。
- 并发冲突返回 `K1-ADM-001`（409）。
- 成功：`200 { "data": { "id": "...", "status": "approved" } }`

### DELETE /api/v1/admin/comments/{id}

请求头：`x-csrf-token` 必填。

- 软删除，不物理删除；写审计。
- 成功：`204`，无响应体。
- 不存在或已删除：`K1-CMT-002`（404）。

### GET /api/v1/admin/moderation/policy

- 读取当前策略修订快照。
- 响应：

```json
{
  "data": {
    "policy": {
      "enabled": true,
      "autoApproveMaxRisk": 30,
      "autoBlockMinRisk": 70,
      "blockAction": "spam",
      "minSubmitSeconds": 2,
      "maxSubmitAgeMinutes": 360,
      "maxLinks": 3,
      "duplicateWindowMinutes": 60,
      "duplicateLimit": 1,
      "ipWindowMinutes": 60,
      "ipMaxComments": 8,
      "bannedKeywords": ["刷单"],
      "blockedNames": [],
      "sweepPendingOnSave": true
    },
    "revision": 3,
    "updatedAt": "2026-11-02T08:00:00.000Z",
    "updatedBy": "admin-user-id",
    "source": "stored"
  }
}
```

`source` 为 `default` / `stored` / `fallback`；`fallback` 表示策略配置损坏，系统已回退到全量待审。

### PUT /api/v1/admin/moderation/policy

请求头：`x-csrf-token` 必填。

请求体为完整策略对象，字段同 GET。约束：

- `autoBlockMinRisk` 必须大于 `autoApproveMaxRisk`；
- 数值字段必须为整数且落在允许区间；
- `bannedKeywords` / `blockedNames` 每项 1–40 字符，最多 1000 项，服务端去重。

响应：

```json
{
  "data": {
    "snapshot": { "policy": { "...": "..." }, "revision": 4, "source": "stored" },
    "sweep": { "processed": 2, "approved": 1, "rejected": 0, "spam": 1, "pending": 0, "skipped": 0 }
  }
}
```

保存策略、写入修订与复核存量待审在同一事务内完成；`sweep` 是本次复核计数。

## 6. 错误响应示例

```json
{
  "type": "urn:k1blog:error:k1-cmt-003",
  "title": "评论字段非法或超长",
  "status": 422,
  "detail": "评论最多 2000 个字符",
  "instance": "/api/v1/posts/precision-as-aesthetic/comments",
  "code": "K1-CMT-003",
  "traceId": "d4d3...",
  "errors": [{ "field": "content", "message": "评论最多 2000 个字符" }]
}
```

## 7. 错误码表

| 码            | HTTP | 含义                         |
| ------------- | ---- | ---------------------------- |
| `K1-SYS-000`  | 500  | 服务内部错误                 |
| `K1-REQ-001`  | 400  | 请求体不是合法 JSON          |
| `K1-REQ-002`  | 400  | 路径/查询参数/幂等键格式错误 |
| `K1-AUTH-001` | 401  | 未登录或会话失效             |
| `K1-AUTH-002` | 403  | 权限不足                     |
| `K1-AUTH-003` | 403  | CSRF 校验失败                |
| `K1-AUTH-004` | 429  | 登录尝试过多（预留）         |
| `K1-CMT-001`  | 404  | 文章不存在                   |
| `K1-CMT-002`  | 404  | 评论不存在                   |
| `K1-CMT-003`  | 422  | 评论字段非法或超长           |
| `K1-CMT-004`  | 422  | 父评论不存在或层级非法       |
| `K1-CMT-005`  | 422  | 评论被安全策略拒绝           |
| `K1-CMT-006`  | 409  | 评论状态冲突（预留）         |
| `K1-CMT-007`  | 429  | 评论提交过于频繁             |
| `K1-DB-001`   | 503  | 数据库不可用                 |
| `K1-DB-002`   | 500  | 数据写入失败                 |
| `K1-SEC-001`  | 403  | 请求来源不允许               |
| `K1-ADM-001`  | 409  | 审核状态已被他人变更         |

## 8. 版本与兼容

- 路径版本 `/api/v1`；破坏性变更必须升版本，不得在同一版本内改变字段语义。
- 新增可选字段视为兼容；删除字段、改变枚举、改变错误码视为破坏性变更。
- 客户端不得依赖 `detail` 文案做逻辑判断，只使用 `code` 与 HTTP 状态。
