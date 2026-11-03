import os
import re
import urllib.parse
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

content_dir = ROOT / "content" / "posts"
display_text = []

for file in content_dir.glob("*.mdx"):
    text = file.read_text(encoding="utf-8")
    fm_title = re.search(r"^title:\s*(.+)$", text, re.M)
    if fm_title:
        display_text.append(fm_title.group(1).strip())
    for line in text.splitlines():
        match = re.match(r"^(##|###)\s+(.+)$", line.strip())
        if match:
            display_text.append(match.group(2).strip())

for source in (
    ROOT / "lib" / "projects.ts",
    *sorted((ROOT / "lib" / "project-data").glob("*.ts")),
    ROOT / "app" / "(site)" / "projects" / "page.tsx",
    ROOT / "app" / "(site)" / "projects" / "[slug]" / "page.tsx",
    ROOT / "app" / "(site)" / "essays" / "page.tsx",
    ROOT / "app" / "(site)" / "about" / "page.tsx",
    *sorted((ROOT / "components" / "work").glob("*.tsx")),
    ROOT / "components" / "layout" / "presence-register.tsx",
    ROOT / "components" / "layout" / "presence-dial.tsx",
    ROOT / "components" / "layout" / "presence-data.ts",
):
    if source.exists():
        display_text.append(source.read_text(encoding="utf-8"))

display_text.append(
    "长期写作 文章 全部 关于 搜索 最新 更新 阅读 分钟 评论 管理端 评论审核 "
    "页面不存在 返回首页 相关文章 全部文章 标签 主题 随笔 条评论 条结果 "
    "关键词 正在加载 搜索暂不可用 没有匹配的文章 首页 工作 方法 时间 技术 设计 "
    "项目 阅读随笔 持续维护 已完成 留言 留言审核 留言自动化 自动审核参数 留言台账 管理登录"
)

cjk_text = "".join(
    dict.fromkeys(
        ch
        for ch in "".join(display_text)
        if 0x2E80 <= ord(ch) <= 0x9FFF
        or 0x3000 <= ord(ch) <= 0x303F
        or 0xFF00 <= ord(ch) <= 0xFFEF
    )
)
print("display chars", len(cjk_text))

requests = [
    (
        "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400&text={text}&display=swap",
        cjk_text,
        "noto-serif-display.woff2",
    ),
    (
        "https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,200..800;1,200..800&text={text}&display=swap",
        "#0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;/()-·— ",
        "newsreader.woff2",
    ),
    (
        "https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,200..800;1,200..800&text={text}&display=swap",
        "A journal kept after dark.",
        "newsreader-italic.woff2",
    ),
]

for template, text, filename in requests:
    url = template.format(text=urllib.parse.quote(text, safe=""))
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    css = urllib.request.urlopen(req, timeout=45).read().decode("utf-8")
    blocks = re.findall(r"@font-face\s*\{([^}]*)\}", css)
    print(filename, "blocks", len(blocks))
    for index, block in enumerate(blocks):
        style = re.search(r"font-style:\s*(\w+)", block)
        weight = re.search(r"font-weight:\s*([0-9]+(?:\s+[0-9]+)?)", block)
        src = re.search(r"url\((https://[^)]+)\)", block)
        if not style or not weight or not src:
            continue
        if filename == "newsreader.woff2" and style.group(1) != "normal":
            continue
        if filename == "newsreader-italic.woff2" and style.group(1) != "italic":
            continue
        suffix = "-italic" if style.group(1) == "italic" else ""
        target = OUT / f"{filename.replace('.woff2', '')}{suffix}.woff2" if filename != "newsreader.woff2" else OUT / filename
        if filename == "newsreader-italic.woff2":
            target = OUT / "newsreader-italic.woff2"
        req2 = urllib.request.Request(src.group(1), headers={"User-Agent": UA})
        data = urllib.request.urlopen(req2, timeout=45).read()
        target.write_bytes(data)
        print("saved", target.name, len(data))

faces = """@font-face {
  font-family: 'Newsreader';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  unicode-range: U+0020-007E;
  src: url('/fonts/newsreader.woff2') format('woff2');
}

@font-face {
  font-family: 'Newsreader';
  font-style: italic;
  font-weight: 200 800;
  font-display: swap;
  unicode-range: U+0020-007E;
  src: url('/fonts/newsreader-italic.woff2') format('woff2');
}

@font-face {
  font-family: 'Noto Serif SC';
  font-style: normal;
  font-weight: 400;
  font-display: optional;
  src: url('/fonts/noto-serif-display.woff2') format('woff2');
}

@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF, U+2000-206F, U+2190-21FF;
  src: url('/fonts/plex-mono.woff2') format('woff2');
}

@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  unicode-range: U+0000-00FF, U+2000-206F, U+2190-21FF;
  src: url('/fonts/plex-mono-500.woff2') format('woff2');
}
"""

(ROOT / "styles" / "fonts.css").write_text(faces, encoding="utf-8")
print("fonts.css written")

