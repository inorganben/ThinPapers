# ThinPapers (淡纸)

<img src="src/images/logo-tp.png" width="120" alt="ThinPapers">

[简体中文](README.md) · [繁體中文](README.zh-Hant.md)

ThinPapers is a minimal Chinese writing template built on [Eleventy](https://www.11ty.dev).

Live examples: [xenonben.cn](https://xenonben.cn) · [GitHub Pages](https://inorganben.github.io/ThinPapers/)

## Getting started

```bash
npm install
npm start        # http://localhost:8080, with live reload
npm run build    # outputs _site/
```

Writing a post means adding a Markdown file under `src/posts/`:

```markdown
---
date: 2026-09-01
collection: notes
---

# Put the title on the first line of the body
```

A few notes:

- The title does not go in the front matter: lists and the `<title>` both read the first `#` heading of the body. Dates must be `YYYY-MM-DD`, with zero-padded month and day.
- Collections are defined in `src/_data/topics.json`; site name, description and social links live in `src/_data/site.js`. Replace them with your own.
- Images go in `src/mdimgs/` and are referenced as `![](/mdimgs/photo.jpg)`. List pages automatically pick up the first five images of each post as thumbnails.
- Pushing to `main` publishes to GitHub Pages through GitHub Actions. Deploying to your own server or to object storage is covered in `deploy/README.md`.

## Font and license

The template uses system fonts by default. For a Chinese serif face, download [LXGW Neo ZhiSong](https://github.com/lxgw/LxgwNeoZhiSong) (IPA Font License 1.0) into `src/fonts/` and run `npm run font` once.

The avatar and favicon of the demo site use the chick illustration from [Learn You a Haskell for Great Good!](https://learnyouahaskell.github.io/starting-out.html). That illustration is the copyright of its original author and is not covered by this project's MIT license; if you replace the image, the credit line on the home page must be updated accordingly.

The code and the sample content are released under the [MIT](LICENSE) license.
