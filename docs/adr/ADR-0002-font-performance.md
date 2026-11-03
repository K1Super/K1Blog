# ADR-0002: 字体加载策略（展示子集 + 系统中文正文）

状态：已接受  
日期：2026-10-31  
适用范围：K1Blog 全站字体管线

## 背景

初期把 Google Fonts 的 Noto Serif SC / Noto Sans SC 全量 unicode-range 切片（202 个文件、约 5.6MB）自托管。实测首页首屏加载 20 个字体切片、约 763KB；文章页 28 个切片、约 932KB。远超首屏字体预算，且中文正文的长文本会持续触发新的切片请求。

## 决策

1. **展示字体**：只保留 Noto Serif SC 的站点展示子集（标题、栏目标题、页面显示文案，约 100 字符、20KB），加 Newsreader 数字/斜体子集与 IBM Plex Mono。展示字体使用 `preload` + `font-display: optional`。
2. **正文中文**：使用系统中文黑体（PingFang SC / Microsoft YaHei / Noto Sans CJK），不加载全量 Noto Sans 切片。
3. **维护**：新增标题/栏目字符后运行 `pnpm fonts:build` 重新生成展示子集；脚本位于 `scripts/fonts/build-display-font.py`。
4. **字体 CSS** 只保留 6 个 @font-face；删除 202 个全量切片与 Plex Sans 文件。

## 后果

正面：

- 首屏字体从 763–932KB 降至约 70KB；
- 首屏字体文件数从 20–28 个降至 4–5 个；
- 标题/栏目仍保持思源宋体展示效果；
- 中文字体缓存与 CDN 命中更稳定。

负面：

- 正文中文由系统字体渲染，Windows 上是 Microsoft YaHei，Mac 上是 PingFang SC；不同平台的正文气质略有差异；
- 展示子集不覆盖未来未生成的标题字符，必须通过 `fonts:build` 维护；
- 展示字体在慢网络下可能按 `optional` 使用系统宋体回退，需要在新增文案后检查。

## 验证

- 首屏字体加载量与文件数；
- 390 / 768 / 1440 / 1920 与深色/浅色双主题截图；
- `font-display` 与 LCP 实测；
- `pnpm fonts:build` 可重复生成子集。
