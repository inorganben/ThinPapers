---
date: 2026-09-01
---

# 欢迎使用 ThinPapers

这是模板的第一篇文章，顺便说明文章该怎么写。新建文章就是在 `src/posts/` 下加一个 `.md` 文件：

```markdown
---
date: 2026-09-01
collection: notes
---

# 文章标题写在正文第一行

正文内容……
```

几条约定：

- 标题不用写进 front matter：列表和浏览器标签页都会自动取正文第一个 `#` 一级标题，没有一级标题则取第一段文字（按行宽截断）。
- `collection` 对应合集页的分类，取值来自 `src/_data/topics.json`；不写就只出现在时间线里。
- `pinned: true` 可以在它所在的列表里置顶。
- 日期写成 `YYYY-MM-DD`（月、日补零），否则 Eleventy 解析不出来，该篇会静默构建失败。
- 图片放 `src/mdimgs/`，正文里写 `![](/mdimgs/图片名.jpg)`。列表页会自动取每篇的前五张图做预览缩略图。
