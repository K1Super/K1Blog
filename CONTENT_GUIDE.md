# K1Blog 内容指南

> 版本：v1.0.0  
> 内容目录：`content/posts/`  
> 校验：`pnpm content:check`  
> 上游：[docs/05-内容评论与数据规范.md](./docs/05-内容评论与数据规范.md)

## 1. 内容模型

每篇文章是一个 `.mdx` 文件，frontmatter 由 Zod 校验（`features/content/schema.ts`）。文件名必须为：

```text
YYYY-MM-DD-<slug>.mdx
```

其中 `<slug>` 必须与 frontmatter 的 `slug` 完全一致，否则构建失败。

## 2. Frontmatter

```yaml
---
title: 精确是一种审美
slug: precision-as-aesthetic
description: 精确不是冷冰冰的约束，而是一种把注意力放回细节的审美能力。
publishedAt: 2026-10-24
updatedAt: 2026-10-24
status: published
tags:
  - 观测
  - 设计
featured: false
locale: zh-CN
---
```

| 字段          | 必填 | 规则                                                               |
| ------------- | ---- | ------------------------------------------------------------------ |
| `title`       | 是   | 1–80 字符；展示字体子集会覆盖其中文字符                            |
| `slug`        | 是   | 1–80；小写字母/数字/连字符；必须与文件名一致                       |
| `description` | 是   | 1–160 字符；用于 SEO、RSS、检索                                    |
| `publishedAt` | 是   | `YYYY-MM-DD`                                                       |
| `updatedAt`   | 否   | `YYYY-MM-DD`；用于 sitemap 与 JSON-LD                              |
| `status`      | 是   | `draft` 或 `published`；只有 `published` 参与构建                  |
| `tags`        | 是   | 1–5 个；每个 1–24 字符                                             |
| `cover`       | 否   | `{ src, alt, width, height, caption? }`；有图必须同时有 alt 与尺寸 |
| `featured`    | 否   | 布尔，默认 false                                                   |
| `canonical`   | 否   | 合法 URL；用于转载/首发声明                                        |
| `ogImage`     | 否   | 分享图路径；当前文章 metadata 统一使用 `/og.png`                   |
| `locale`      | 否   | 仅 `zh-CN`                                                         |

## 3. 写作规范

- 中文为主，技术术语保留英文；中英文之间保留一个空格。
- 标题不使用夸张营销语；描述必须能独立成立，不依赖标题。
- 正文以长文为主；段落短，单段尽量不超过 5 行。
- 引用必须注明来源；外部链接使用完整 URL。
- 代码块必须标注语言；避免超长行（>100 字符）。
- 图片必须有信息价值；无图注的装饰图不得进入正文。
- 不使用 emoji 作为结构符号；需要强调时用文字与排版。
- 不写“AI 生成”套话、不写与文章无关的订阅/关注号召。

## 4. Markdown 与 MDX 能力

当前 MDX 管线只启用：

- `remark-gfm`：表格、任务列表、自动链接等 GFM 语法；
- `rehype-pretty-code`（`vesper` 主题，透明背景）：代码高亮；
- 自定义 `h2` / `h3`：根据标题文本生成稳定 id，供目录跳转；
- 外链自动加 `rel="noopener noreferrer"`。

未提供自定义 MDX 组件（如 Callout、Figure）。如需新增：

1. 在 `features/content/mdx.tsx` 注册组件；
2. 组件必须遵守 `docs/04` 的视觉语言；
3. 补充示例、类型与测试；
4. 更新本指南。

### 标题与目录

- 使用 `##` 与 `###`，不要用 `#`（页面已有一级标题）。
- 标题文本会经 `slugifyHeading` 生成 id；重复标题会冲突，必须避免。
- 目录由 `extractHeadings` 从正文提取，只包含 h2/h3。

### 代码

````markdown
```ts
const answer = 42;
```
````

代码块行号、语法色由 `rehype-pretty-code` 生成；禁止霓虹主题、发光边框。

### 表格

使用 GFM 表格；数字右对齐、表头简洁。表格宽度不得超过正文测量宽度。

### 图片

```markdown
![图表：刻度与指针](/images/bearing.jpg)
```

- 图片放入 `public/images/`，使用 AVIF/WebP 优先，单图 ≤200KB。
- 必须写有意义的 alt；图注使用正文下一行说明来源与帧号。
- 禁止 AI 插画、3D 漂浮物、通用图库拼贴。

## 5. 发布流程

```text
写作 → 本地 pnpm dev 预览
  → pnpm content:check（frontmatter/slug/日期/重复）
  → pnpm search:index（更新检索索引）
  → pnpm fonts:build（若新增标题/栏目字符）
  → pnpm lint && pnpm typecheck && pnpm test
  → pnpm build（SSG 校验）
  → 提交并部署
```

`prebuild` 会自动执行内容检查与索引生成；内容失败会阻断构建。

### 新增文章检查清单

- [ ] 文件名日期与 `publishedAt` 一致
- [ ] 文件名 slug 与 frontmatter `slug` 一致
- [ ] `status` 为 `published`（或明确保持 draft）
- [ ] `description` ≤160 且可独立阅读
- [ ] 标签 1–5 个，复用现有标签优先
- [ ] 标题/小标题没有重复
- [ ] 图片有 alt、尺寸、来源
- [ ] 代码块有语言标注
- [ ] 运行 `pnpm fonts:build`（新增标题字符时）
- [ ] 运行 `pnpm content:check` 与 `pnpm build`

## 6. SEO 与分发

| 产物          | 行为                                                   |
| ------------- | ------------------------------------------------------ |
| 页面 metadata | 标题、描述、canonical、Open Graph、Twitter Card        |
| JSON-LD       | 文章页输出 `Article`，含作者、日期、关键词             |
| RSS           | `/feed.xml`，按发布时间倒序，包含标题、链接、描述      |
| Sitemap       | `/sitemap.xml`，包含首页、归档、关于、检索、文章、标签 |
| Robots        | 禁止 `/admin`、`/api`；声明 sitemap                    |
| 分享图        | `/og.png`，1200×630，作为静态资源随仓库提交            |
| 检索          | `/search-index.json`，标题/描述/标签                   |

注意：

- `ogImage` 字段当前不会改变文章分享图；如需每篇文章独立分享图，需要扩展 `generateMetadata` 并预先准备对应静态图片。
- 修改站点名称、描述、导航时，同步更新 `lib/site.ts` 与 `app/layout.tsx` 的 JSON-LD。

## 7. 字体与展示字符

展示字体只覆盖当前标题、栏目名与页面显示文案。新增以下内容后必须重新生成：

- 文章标题或 h2/h3 中出现新汉字；
- 首页/归档/检索/关于/评论/管理端新增固定文案；
- 品牌名、导航、页脚变更。

```bash
pnpm fonts:build
```

脚本会从 `content/posts/*.mdx` 的标题、`##`/`###` 行与固定 UI 文案提取字符，调用 Google Fonts `text=` 生成子集，写入 `public/fonts/noto-serif-display.woff2`。

验收：新标题在深色与浅色下均显示思源宋体，不退化为系统宋体；首屏字体总量仍在预算内。

## 8. 草稿与删除

- `status: draft` 的文章不会进入页面、RSS、Sitemap、检索索引，但文件仍在仓库。
- 删除文章会改变 URL；如需保留旧链接，先添加重定向或保留占位页（当前未实现自动重定向）。
- 修改 slug 等同于新 URL；必须同步检查站内链接与外部引用。

## 9. 内容评审

- 事实：论断是否有依据；引用是否可追溯。
- 结构：标题层级是否清晰；目录是否能独立说明文章结构。
- 语言：是否有套话、空话、AI 腔；是否中英混排规范。
- 视觉：标题长度是否适配字阶；图片是否合规；代码块是否可读。
- 合规：是否包含个人隐私、未授权图片、敏感信息。
- 发布：`pnpm content:check`、`pnpm build`、`pnpm test` 全部通过。

## 10. 当前内容

仓库包含 3 篇原创示例文章：

| 文件                                    | 标题                   | 标签       |
| --------------------------------------- | ---------------------- | ---------- |
| `2026-10-24-precision-as-aesthetic.mdx` | 精确是一种审美         | 观测、设计 |
| `2026-10-18-text-still-glows.mdx`       | 屏幕之后，文字仍在发光 | 技术、阅读 |
| `2026-10-09-time-as-a-ruler.mdx`        | 把时间做成一把尺       | 时间、观测 |

正式运营前请替换为作者自己的内容与身份信息。
