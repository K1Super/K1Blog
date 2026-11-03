# K1Blog 设计系统实现索引

> 版本：v1.3.5  
> 规范源：[docs/04-视觉与交互设计系统规范.md](./docs/04-视觉与交互设计系统规范.md)  
> 视觉基线：生产实现（`app/`、`components/`、`styles/`）  
> 本文记录「规范如何落地」，不替代规范。

## 1. 概念

**低照度写作界面**：以文字为中心，编号、刻度、状态只在边缘工作。深色是默认阅读环境，浅色是另一种阅读状态。视觉保持克制、精密、无装饰性叙事。

设计法：

1. 装饰必须能解释为结构：刻度、索引、坐标、状态。
2. 一屏只允许一个主动效焦点。
3. 颜色只承担语义，不做氛围渐变；全站只有一个主强调色。
4. 动效只做状态迁移，不做表演。
5. 可读性优先于风格。

首页是纯展示场：只负责气质、主题与鼠标联动，不出现文章列表或文章摘要；阅读入口由胶囊导航与 CTA 承担。

## 2. Token 落地

实现文件：`styles/tokens.css`。所有组件只使用语义变量，不写裸 hex。

### 2.1 深色（默认）

| Token                      | 值             | 用途            |
| -------------------------- | -------------- | --------------- |
| `--bg`                     | `#0c0d0e`      | 夜幕            |
| `--surface`                | `#141517`      | 一级表面        |
| `--surface-2`              | `#1b1c1f`      | 输入区/二级表面 |
| `--text`                   | `#e9e3d6`      | 标题            |
| `--body-text`              | `#cfc8ba`      | 正文            |
| `--muted`                  | `#a9a397`      | 辅助            |
| `--faint`                  | `#8a857b`      | 元数据          |
| `--amber`                  | `#d49a45`      | 唯一强调色      |
| `--oxide`                  | `#6c8792`      | 预留次强调      |
| `--danger`                 | `#c95c45`      | 危险            |
| `--success`                | `#86a07e`      | 成功            |
| `--overlay`                | 黑 68%         | 模态遮罩        |
| `--rule` / `--rule-strong` | 骨白 14% / 30% | 发丝线与结构线  |

### 2.2 浅色

| Token         | 值        | 用途           |
| ------------- | --------- | -------------- |
| `--bg`        | `#e9e3d6` | 暖纸           |
| `--surface`   | `#e2dac9` | 一级表面       |
| `--surface-2` | `#dcd3c1` | 输入区         |
| `--text`      | `#16181a` | 标题           |
| `--body-text` | `#2b2a26` | 正文           |
| `--muted`     | `#5f594f` | 辅助           |
| `--faint`     | `#6a6155` | 元数据         |
| `--amber`     | `#8f5a1a` | 强调（深琥珀） |
| `--danger`    | `#a84532` | 危险           |
| `--success`   | `#56745a` | 成功           |
| `--overlay`   | 黑 55%    | 模态遮罩       |

### 2.3 使用约束

- 强调色只用于编号、当前态、指针、关键下划线、状态线，占比 ≤5%。
- 禁止线性/径向渐变、发光、彩色阴影、玻璃拟态、超大圆角。
- 两个主题必须成对维护；新增 token 必须同时给出深色与浅色值。
- 组件内禁止裸 hex；确需测量色必须进入 token 文件并评审。

## 3. 字体

实现文件：`styles/fonts.css`、`styles/tokens.css`。

| 角色   | 字族                                                          | 加载                           |
| ------ | ------------------------------------------------------------- | ------------------------------ |
| 展示   | Newsreader + Noto Serif SC 展示子集                           | 本地 WOFF2，标题/栏目/页面文案 |
| 正文   | 系统中文黑体（PingFang SC / Microsoft YaHei / Noto Sans CJK） | 不加载全量中文字库             |
| 元数据 | IBM Plex Mono 400/500                                         | 编号、日期、读数、标签         |

- `public/fonts/noto-serif-display.woff2` 约 20KB，只覆盖当前标题与 UI 字符。
- 根布局 preload 展示字体；`font-display: optional` 避免慢网络下的迟到换字。
- 首屏字体目标 ≤80KB，硬上限 ≤220KB。
- 新增标题、栏目或页面显示文案后必须运行 `pnpm fonts:build`，再检查是否出现系统宋体回退。
- 字体裁剪脚本：`scripts/fonts/build-display-font.py`；决策记录：`docs/adr/ADR-0002-font-performance.md`。
- 中文正文使用系统黑体是明确取舍，不是缺失；禁止用楷体/手写体承担正文。

## 4. 字阶与版式

| 层级     | 实现                                                              |
| -------- | ----------------------------------------------------------------- |
| 展示场   | 无可见巨型标题；`h1` 使用 `sr-only`；由引子与导语承担首屏文字层级 |
| 栏目     | `clamp(36px, 4.2vw, 62px)`                                        |
| 文章标题 | `clamp(34px, 4vw, 56px)`，移动端 34px                             |
| H2       | `clamp(24px, 2.4vw, 34px)`                                        |
| H3       | `clamp(20px, 1.8vw, 24px)`                                        |
| 正文     | 17px / 1.85，单行 38–40 汉字                                      |
| 导航     | 11px / 0.08em                                                     |
| 元数据   | 9px / 0.14–0.20em，等宽、tabular-nums                             |

- 首页展示场以视口为骨架，文本区最大 1120px；内容页使用 12 栏非对称构图；正文不居中。
- 页边距 `clamp(20px, 3.2vw, 48px)`；左侧阅读进度尺 88px（≥1101px）。
- 断点：≥1201 完整版式；1101–1200 胶囊导航略收窄；1025–1100 隐藏进度尺；721–1024 单栏且 Hero 满屏；≤720 移动版、时钟隐藏、胶囊四项压缩。
- 任何断点禁止横向滚动、文字裁切、触控目标过小。

## 5. 组件映射

| 组件            | 文件                                              | 实现要点                                                             |
| --------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| 页头            | `components/layout/masthead.tsx`                  | 右侧胶囊导航 + 时钟 + 光照切换；无品牌字标                           |
| 主导航          | `components/layout/site-nav.tsx`                  | 四项等宽胶囊；药丸 420ms 滑动；hover/focus 预览；`aria-current` 语义 |
| 站点图标        | `app/favicon.ico` / `icon.png` / `apple-icon.png` | 部署者提供的企鹅图标，透明底，保留原图配色                           |
| 光照切换        | `components/layout/theme-toggle.tsx`              | 太阳/月亮图标，无边框，44×44 命中区，`aria-pressed`                  |
| 时钟            | `components/layout/clock.tsx`                     | CST，等宽，tabular-nums                                              |
| 阅读进度尺/进度 | `components/layout/rail.tsx`                      | 1px 刻度，1/40 离散，passive + rAF                                   |
| 首页展示场      | `components/layout/hero.tsx`                      | 满屏指针场、引子、导语、引导 CTA；无标题或文章摘要                   |
| 指针场          | `components/layout/field.tsx`                     | Canvas 发丝线/刻度/准星/坐标读数；指针 rAF、主题重绘、减少动效静态   |
| 首页在场记录    | `components/layout/presence-register.tsx`         | 右侧迷你状态盘与三通道纸带；旁注层级，不占主视觉                     |
| 在场状态盘      | `components/layout/presence-dial.tsx`             | 五态刻度盘、琥珀游标、状态汉字                                       |
| 记录驱动        | `components/layout/use-presence-register.ts`      | 指针采样、三通道画布、主题重绘、减少动效静态                         |
| 记录常量        | `components/layout/presence-data.ts`              | 状态、通道、刻度数据                                                 |
| 首页成果架      | `components/layout/result-shelf.tsx`              | 不等宽成果卡片，真实图像与三枚结果板；链接至项目详情                 |
| 文章列表行      | `components/content/post-row.tsx`                 | 行式台账；悬停顶线/位移/箭头                                         |
| 文章头          | `components/content/article-view.tsx`             | 编号、日期、阅读时长、标签、状态                                     |
| 目录            | `components/content/article-toc.tsx`              | 纵向胶片格，当前格琥珀刻度                                           |
| 评论            | `components/comments/comment-section.tsx`         | 行式列表、编号、无卡片、无邮箱                                       |
| 评论表单        | `components/comments/comment-form.tsx`            | 默认空白、可见标签、蜜罐隐藏、幂等、202 提示                         |
| 管理端概览      | `components/admin/moderation-overview.tsx`        | 运行状态、策略修订、四格度量条、24 小时自动计数                      |
| 自动化控制台    | `components/admin/automation-console.tsx`         | 策略表单与台账联动，自动保存后复核并刷新                             |
| 策略参数        | `components/admin/automation-policy-form.tsx`     | 修改后自动保存、REV 与保存状态、字段错误、CSRF                       |
| 策略字段        | `components/admin/automation-policy-fields.tsx`   | 两个面板；词表折叠按钮与「、」分隔的模态编辑                         |
| 紧凑数值        | `components/admin/policy-number-field.tsx`        | 短读数据输入，不铺满整行；等宽数字与单位                             |
| 风险刻度        | `components/admin/risk-scale.tsx`                 | 并入判定阈值面板；0–100 刻度、发布/待审/拦截三段线                   |
| 词表模态        | `components/admin/policy-word-dialog.tsx`         | 原生 dialog、遮罩、CSV/TXT 导入预览、追加/替换                       |
| 留言台账        | `components/admin/comment-ledger.tsx`             | 固定高度内滚动、状态筛选常驻、分页、自动判定与人工兜底               |
| 台账行          | `components/admin/comment-ledger-row.tsx`         | 长文折叠/展开、风险与原因、状态与处置按钮                            |
| Toast           | 未引入                                            | 错误以内联文本呈现                                                   |

## 6. 动效

实现：`styles/site.css`、`styles/pages.css`；决策：`docs/adr/ADR-0001-css-first-motion.md`。

| Token    | 值                               | 用途                   |
| -------- | -------------------------------- | ---------------------- |
| `--d1`   | 120ms                            | 悬浮、颜色、刻度       |
| `--d2`   | 240ms                            | 导航线、标题位移、箭头 |
| `--d3`   | 400ms                            | 常规揭示、读数         |
| `--d4`   | 600ms                            | 页面迁移、主题擦除     |
| `--ease` | `cubic-bezier(0.2, 0.7, 0.1, 1)` | 全站曲线               |

- 首屏文字以 400ms 阶梯揭示，首帧可见，避免 LCP 延迟。
- 主题切换 600ms 从右向左裁剪擦除；不支持 View Transition 时即时切换。
- 导航药丸 420ms `cubic-bezier(0.32, 0.72, 0, 1)`；文字反白延迟 200ms，避免滑动中读到反色文字。
- 首页指针场只在指针移动时启动 rAF，衰减后停止；主题切换重绘，减少动效时静态。
- 首页在场记录同样只在指针活动时采样与重绘，停止 1s 后回到静；无指针时不启动 rAF。
- 首页成果架以 400ms 纯透明度淡入；卡片悬停只改变边框、标题、箭头与图像缩放。
- 只动画 `transform/opacity/clip-path`；禁止动画宽高、margin、top/left。
- 滚动监听 passive + rAF；减少动效时内容完整、无空白、无裁切。
- 唯一无限动画是底部场提示点（3s 脉冲），减少动效时隐藏。

## 7. 无障碍

- 目标 WCAG 2.2 AA；正文对比度 ≥7:1，辅助 ≥4.5:1。
- 键盘可达；焦点 2px 琥珀描边，offset ≥3px；不移除 `:focus-visible`。
- 触控目标 ≥44×44：光照切换视觉 30×30，命中区 44×44。
- 装饰 SVG `aria-hidden`；Canvas 与坐标读数 `aria-hidden`；不提供无意义的方位/罗盘控件。
- 首页在场记录整块 `aria-hidden`；刻度盘与纸带不进入可访问性树。
- 首页成果卡是真实链接，图像提供替代文本；结果板装饰元素 `aria-hidden`。
- 胶囊导航保留真实链接与 `aria-current="page"`，药丸只是装饰。
- 主题切换是按钮，`aria-pressed` + 动态 `aria-label`。
- 表单标签可见、错误 `aria-describedby`、状态可访问。
- 页面有 landmarks、skip link、唯一标题、合理标题层级。
- 实测：axe 桌面/移动首页与文章页 0 serious/critical。

## 8. 内容呈现

- 文章头是信息卡，不是通用大标题 + 副标题。
- 正文 17px / 1.85，38–40 汉字/行；引用左侧双线 + 编号；列表方形刻度。
- 图片宽度不超过正文测量宽度；图注等宽 9px，含帧号/来源；禁止无图注装饰图。
- 代码块 `#08090A` 底、发丝边、行号次墨；语法色限制在琥珀/骨白/氧化蓝。
- 空状态用直陈语言，不使用插画/emoji/卡通角色。
- 404 使用“页面不存在”直陈语言 + 返回首页。

## 9. 验收证据

本地最终截图覆盖：

- 390 / 768 / 1440 / 1920
- 深色 / 浅色
- 首页、文章、全部文章、搜索、关于、管理登录、留言自动化控制台
- 首页悬停/聚焦胶囊导航、指针场联动、坐标读数
- 减弱动效状态
- 无横向溢出；390 / 768 / 1440 / 1920 首页均为满屏无纵向滚动

性能证据（Lighthouse，2026-11-01）：

| 页面   | 性能 | 无障碍 | LCP    | TBT   | CLS     |
| ------ | ---- | ------ | ------ | ----- | ------- |
| 首页   | 0.97 | 1      | 2464ms | 121ms | 0.00002 |
| 文章页 | 0.98 | 1      | 2199ms | 86ms  | 0.00021 |

## 10. 变更规则

- 任何 UI/样式/动效改动，先对照 `docs/04` 与本文件。
- 新增 token 必须同时提供两套主题值；新增字体必须更新 `pnpm fonts:build` 与预算。
- 新增组件必须在第 5 节登记文件与职责。
- 改动后必须重新跑 390/768/1440/1920 + 双主题 + 减少动效检查，并附截图。
- 性能预算变更必须更新 `docs/adr/ADR-0003-performance-budget.md`，不得静默降级。
