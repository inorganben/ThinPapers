# 淡纸 ThinPapers

<img src="src/images/logo-tp.png" width="120" alt="淡纸">

[English](README.en.md) · [繁體中文](README.zh-Hant.md)

淡纸是一个基于 [Eleventy](https://www.11ty.dev) 的极简中文写作模板。

示例站点：[xenonben.cn](https://xenonben.cn) · [GitHub Pages](https://inorganben.github.io/ThinPapers/)

## 怎么用

```bash
npm install
npm start        # http://localhost:8080，带热更新
npm run build    # 产出 _site/
```

写文章就是在 `src/posts/` 下新建一个 Markdown 文件：

```markdown
---
date: 2026-09-01
collection: notes
---

# 标题写在正文第一行
```

几点说明：

- 标题不用写进 front matter，列表和浏览器标签页都取正文第一个 `#` 一级标题；日期要写足 `YYYY-MM-DD`（月日补零）。
- 合集在 `src/_data/topics.json` 里定义，站名、简介、社交链接在 `src/_data/site.js`，换成自己的即可。
- 图片放 `src/mdimgs/`，正文里写 `![](/mdimgs/xxx.jpg)`；列表页会自动取每篇正文的前五张图做缩略图。
- 推到 `main` 分支后由 GitHub Actions 自动发布到 GitHub Pages；部署到自己的服务器或对象存储见 `deploy/README.md`。

## 字体与许可

模板默认使用系统字体。想换成中文衬线体，可以自己下载[霞鹜新致宋](https://github.com/lxgw/LxgwNeoZhiSong)（IPA Font License 1.0）放进 `src/fonts/`，再跑一次 `npm run font`。

示例站点的头像与 favicon 使用[《Learn You a Haskell for Great Good!》](https://learnyouahaskell.github.io/starting-out.html)的小鸡插图，该插图版权归原作者所有，不适用本项目的 MIT 许可；替换该图片时，须同时更新首页的署名。

代码与示例内容以 [MIT](LICENSE) 许可发布。
