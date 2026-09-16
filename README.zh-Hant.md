# 淡紙 ThinPapers

<img src="src/images/logo-tp.png" width="120" alt="淡紙">

[English](README.en.md) · [简体中文](README.md)

淡紙是一個基於 [Eleventy](https://www.11ty.dev) 的極簡中文寫作模板。

示例站點：[xenonben.cn](https://xenonben.cn) · [GitHub Pages](https://inorganben.github.io/ThinPapers/)

## 怎麼用

```bash
npm install
npm start        # http://localhost:8080，帶熱更新
npm run build    # 產出 _site/
```

寫文章就是在 `src/posts/` 下新建一個 Markdown 檔案：

```markdown
---
date: 2026-09-01
collection: notes
---

# 標題寫在正文第一行
```

幾點說明：

- 標題不用寫進 front matter，列表和瀏覽器標籤頁都取正文第一個 `#` 一級標題；日期要寫足 `YYYY-MM-DD`（月日補零）。
- 合集在 `src/_data/topics.json` 裡定義，站名、簡介、社交連結在 `src/_data/site.js`，換成自己的即可。
- 圖片放 `src/mdimgs/`，正文裡寫 `![](/mdimgs/xxx.jpg)`；列表頁會自動取每篇正文的前五張圖做縮略圖。
- 推到 `main` 分支後由 GitHub Actions 自動發佈到 GitHub Pages；部署到自己的伺服器或物件儲存見 `deploy/README.md`。

## 字體與許可

模板預設使用系統字體。想換成中文襯線體，可以自己下載[霞鶩新緻宋](https://github.com/lxgw/LxgwNeoZhiSong)（IPA Font License 1.0）放進 `src/fonts/`，再跑一次 `npm run font`。

示例站點的頭像與 favicon 使用[《Learn You a Haskell for Great Good!》](https://learnyouahaskell.github.io/starting-out.html)的小雞插圖，該插圖版權歸原作者所有，不適用本專案的 MIT 許可；替換該圖片時，須同時更新首頁的署名資訊。

程式碼與示例內容以 [MIT](LICENSE) 許可發佈。
