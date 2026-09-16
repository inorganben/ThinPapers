const fs = require("fs");
const path = require("path");
const { imageSize } = require("image-size");
const topics = require("./src/_data/topics.json");

// 文章图片 OSS 前缀：空 = 本地 /mdimgs/；
// 走 OSS 构建时注入 https://<bucket>.<region>.aliyuncs.com，
// 只作用于 /mdimgs/ 路径，同时给图片挂上 OSS 现场缩放参数（见下面的 previews 过滤器）
const ossBase = process.env.OSS_BASE || "";

// 部署路径前缀：默认 "/"（根域）。托管在子目录时用 PATH_PREFIX 指定，
// 例如 GitHub Pages 项目页：PATH_PREFIX=/ThinPapers/
const pathPrefix = process.env.PATH_PREFIX || "/";
const prefix = pathPrefix.replace(/\/+$/, ""); // "" 或 "/ThinPapers"
const local = (url) =>
  url && url.startsWith("/") && !url.startsWith("//") ? prefix + url : url;

module.exports = async function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/mdimgs");
  // 字体子集是可选产物（npm run font 生成）：源文件与产物都不入库，
  // 没有就跳过拷贝，模板里也不引这份 CSS，直接用系统字体栈
  const fontDist = path.join(__dirname, "src/fonts/dist");
  eleventyConfig.addGlobalData("hasFontSubset", () =>
    fs.existsSync(path.join(fontDist, "result.css")),
  );
  if (fs.existsSync(fontDist)) {
    // 只拷贝字体分包和样式表；dist 里的演示页 index.html 会被 11ty 当模板，跳过
    eleventyConfig.addPassthroughCopy("src/fonts/dist/*.woff2");
    eleventyConfig.addPassthroughCopy("src/fonts/dist/result.css");
  }
  eleventyConfig.addPassthroughCopy({
    "node_modules/katex/dist/katex.min.css": "css/katex.min.css",
    "node_modules/katex/dist/fonts": "css/fonts",
  });

  // 构建期代码高亮：Shiki（VS Code 同款引擎）直接接入 markdown-it。
  // markdown-it 的 highlight 回调是同步的，Shiki 4.x 顶层 API 是 async，
  // 因此先预建 highlighter 实例（同步 codeToHtml）再挂进渲染器。
  const { createHighlighter } = await import("shiki");
  const highlighter = await createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: [
      "javascript", "typescript", "markdown", "html", "css", "json",
      "bash", "python", "haskell", "yaml",
    ],
  });

  const katex = (await import("katex")).default;
  const texmath = (await import("markdown-it-texmath")).default;

  eleventyConfig.amendLibrary("md", (md) => {
    md.set({
      highlight: (code, lang) => {
        if (!lang) return "";
        try {
          // 双主题输出为 CSS 变量（--shiki-light/--shiki-dark），
          // 由 style.css 里的 [data-theme="dark"] 规则切换，与站点头像主题联动
          return highlighter.codeToHtml(code, {
            lang,
            themes: { light: "github-light", dark: "github-dark" },
            defaultColor: false,
          });
        } catch {
          return ""; // 未预载的语言回退为默认无高亮渲染
        }
      },
    });

    md.use(texmath, {
      engine: katex,
      delimiters: "dollars",
      katexOptions: { throwOnError: false },
    });

    // 文章图片双方案：/mdimgs/ 路径在 OSS 构建时换成 OSS 域名，
    // 本地构建（含子目录部署）加路径前缀；外部地址不动
    const defaultImage = md.renderer.rules.image;
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const src = token.attrGet("src");
      if (src && src.startsWith("/mdimgs/")) {
        token.attrSet("src", ossBase ? ossBase + src : local(src));
      }
      return defaultImage
        ? defaultImage(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options);
    };
  });

  // 统一日期显示格式：YYYY-MM-DD
  eleventyConfig.addFilter("isoDate", function (value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  });

  const stripTags = (html) => html.replace(/<[^>]*>/g, "");
  const decodeEntities = (s) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  // 只提取正文第一个 <h1> 的文本（用于 <title>）
  eleventyConfig.addFilter("extractH1", function (html) {
    if (!html) return "";
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    return h1 ? decodeEntities(stripTags(h1[1])).trim() : "";
  });

  // 列表标题：正文 # 一级标题，没有则取第一段全文（截断交给 CSS 按行宽省略，自适应屏宽）
  eleventyConfig.addFilter("extractTitle", function (html) {
    if (!html) return "";
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    if (h1) return decodeEntities(stripTags(h1[1])).trim();
    const p = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    return p ? decodeEntities(stripTags(p[1])).trim() : "";
  });

  // ---------- 列表预览缩略图 ----------
  // 缩略图不落本地文件，也不做预生成：OSS 构建时给图片地址挂上图片处理参数，
  // 由 OSS 现场缩放（973KB → 15KB，400px 宽），本地开发直接读原图——
  // 同一台机器上流量不计，本地只看排版。所以「用不到的图」自然不会有任何开销：
  // 只有进得了预览的图才会被请求，其余图片连 URL 都不会生成。
  const MAX_PREVIEW = 5;
  const THUMB_PROCESS = "image/resize,w_400/quality,q_58";
  const imgRoot = path.join(__dirname, "src");

  const sizeCache = new Map();
  function localImageSize(url) {
    if (sizeCache.has(url)) return sizeCache.get(url);
    let size = null;
    try {
      size = imageSize(fs.readFileSync(path.join(imgRoot, url)));
    } catch {
      size = null; // 文件不存在（外链图、或引用还没有对应文件）→ 这一张不进预览
    }
    sizeCache.set(url, size);
    return size;
  }

  // 正文里的地址是渲染过的：markdown-it 会把中文文件名等按 URL 编码写进 src
  //（/mdimgs/北宋_….jpg → /mdimgs/%E5%8C%97%E5%AE%8B_….jpg）。
  // 地址本身保持编码态直接给浏览器用，只有落到磁盘读尺寸时才需要解回来。
  const decodePath = (url) => {
    try {
      return decodeURIComponent(url);
    } catch {
      return url; // 有裸 % 之类的非法编码，原样试一次
    }
  };

  // 返回 { k, items }：k 是这一排的行高（单位 = 正方形边长 S 的倍数），
  // items 里每张带 --w（宽度同样是 S 的倍数）。模板只负责乘 --thumb-s，
  // 不用 JS 量宽度，也不会因为图片加载先后而抖动。
  //
  // 排版规则：五格正方形就是这一排的宽度上限。正好五张时五格正方形（总数正好 5S）；
  // 不足五张时形状跟随图片各自的比例流动，但整排宽度仍不得超过 5S →
  // 行高 k = min(1, 5 / Σ长宽比)，图多或图特别宽时整排等比缩矮。
  eleventyConfig.addFilter("previews", function (html) {
    const empty = { k: 1, items: [] };
    if (!html) return empty;

    const found = [];
    const re = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let m;
    while (found.length < MAX_PREVIEW && (m = re.exec(html))) {
      // 渲染后的正文已经带上 OSS 域名或部署前缀，这里退回站内路径
      let src = m[1];
      if (ossBase && src.startsWith(ossBase)) src = src.slice(ossBase.length);
      else if (prefix && src.startsWith(prefix + "/")) src = src.slice(prefix.length);
      if (!src.startsWith("/mdimgs/")) continue; // 外链图不参与预览
      const size = localImageSize(decodePath(src));
      if (!size) continue;
      const alt = m[0].match(/alt="([^"]*)"/);
      found.push({
        src,
        alt: alt ? alt[1] : "",
        ar: size.width / size.height,
      });
    }
    if (!found.length) return empty;

    // 正好五张：强制正方形。此时不再看图片自身比例，行高就是 S
    const square = found.length === MAX_PREVIEW;
    const sum = found.reduce((s, i) => s + i.ar, 0);
    const k = square ? 1 : Math.min(1, MAX_PREVIEW / sum);
    const round = (n) => Math.round(n * 1000) / 1000;

    return {
      k: round(k),
      items: found.map((i) => ({
        alt: i.alt,
        thumb: ossBase
          ? ossBase + i.src + "?x-oss-process=" + THUMB_PROCESS
          : local(i.src),
        w: round(square ? 1 : k * i.ar),
        h: round(square ? 1 : k),
      })),
    };
  });

  // 取月份的数字 1~12（时间线分隔尺用）
  eleventyConfig.addFilter("getMonth", function (d) {
    return d ? d.getUTCMonth() + 1 : 1;
  });

  // 按月份分组（输入需已按日期倒序）
  eleventyConfig.addFilter("byMonth", function (posts) {
    const groups = new Map();
    for (const post of posts) {
      const d = post.data.date;
      if (!d) continue;
      const key = `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(post);
    }
    return [...groups.entries()].map(([month, items]) => ({ month, items }));
  });

  // 时间线年份页：pagination 只认现成的数组（computed data 在分页映射阶段尚未求值），
  // 把年份分组注册为自定义 collection（此时全部文章已加载），供 pagination.data 引用
  const byYear = require("./src/_lib/tlGroups.js");
  eleventyConfig.addCollection("timelineYears", (api) =>
    byYear(api.getFilteredByTag("post")),
  );

  // 按年份分组（输入任意序，输出年从新到旧、年内文章新→旧）
  eleventyConfig.addFilter("byYear", byYear);

  // 合集按年分类：topics.json 里写了 byYear: true 的合集，文章按年份拆成多页
  //（与时间线同一套分组与切换器）。分页只认现成的数组，所以在这里登记成 collection。
  // 没写 byYear 的合集仍是一页列完，走 collection.njk。
  eleventyConfig.addCollection("plainTopics", () =>
    topics.filter((t) => !t.byYear),
  );
  eleventyConfig.addCollection("yearTopics", () =>
    topics.filter((t) => t.byYear),
  );
  eleventyConfig.addCollection("collectionYears", (api) => {
    const posts = api.getFilteredByTag("post");
    const out = [];
    for (const topic of topics.filter((t) => t.byYear)) {
      const mine = posts.filter((p) => p.data.collection === topic.slug);
      for (const g of byYear(mine)) {
        out.push({ topic, year: g.year, items: g.items });
      }
    }
    return out;
  });

  // 筛选出属于某个合集的文章
  eleventyConfig.addFilter("inCollection", function (posts, slug) {
    return posts.filter((p) => p.data.collection === slug);
  });

  // 置顶：front matter 里写 pinned: true 的文章提到最前。
  // filter 保持原相对顺序，所以多个置顶之间沿用的仍是合集本身的排序规则
  //（newestFirst 的翻转在模板里已经先做过了）。
  eleventyConfig.addFilter("pinFirst", function (posts) {
    return [
      ...posts.filter((p) => p.data.pinned),
      ...posts.filter((p) => !p.data.pinned),
    ];
  });

  // njk 模板里的图片地址同样分流：只有 /mdimgs/ 走 OSS 前缀；
  // 其余站内地址（图标、头像、字体）按部署路径加前缀
  eleventyConfig.addFilter("asset", function (url) {
    if (!url) return url;
    return url.startsWith("/mdimgs/") && ossBase ? ossBase + url : local(url);
  });

  return {
    // 子目录部署（如 GitHub Pages 的项目页 https://user.github.io/repo/）时的路径前缀，
    // 由 PATH_PREFIX 环境变量给出；模板里所有站内地址都经过 url 过滤器或 asset 过滤器
    pathPrefix,
    // 站点模板只有 Markdown 和 Nunjucks；排除 html，
    // 避免 fonts/dist 里 cn-font-split 的演示页被当模板处理
    templateFormats: ["md", "njk"],
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
    },
  };
};
