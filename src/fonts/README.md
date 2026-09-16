# 中文字体（可选）

模板默认用系统字体栈渲染，不下载任何字体也能正常显示。想用「霞鹜新致宋」（LXGW Neo ZhiSong）的话：

1. 从 https://github.com/lxgw/LxgwNeoZhiSong 下载 `LXGWNeoZhiSong.ttf`，放到本目录（`src/fonts/`）。
2. `npm run font` —— 用 cn-font-split 按字符集切分成 189 个 woff2 分包，输出到 `src/fonts/dist/`。
3. 重新构建。`src/_layouts/base.njk` 会检测到 `dist/result.css` 存在，自动引入这份 CSS。

## 为什么源文件和产物都不入库

- `.ttf` 源文件 10MB，分包产物又是 7MB，对模板仓库太重了；
- 分包是按**你站点实际用到的字符**切出来的。仓库里带的是别人的分包，你写新字就会缺字回退——自己跑一遍 `npm run font` 才是对的。

所以 `.gitignore` 里排除了 `src/fonts/*.ttf` 和 `src/fonts/dist/`；换字体或大改内容后重跑一次 `npm run font` 即可。

## 许可

「霞鹜新致宋」基于 IPA Font License 1.0 发布，可以自由使用与再分发，但协议要求在使用处说明来源，并告知使用者如何换回原始 IPA 字体——首页 `src/index.njk` 末尾那段 `.font-credit` 就是干这个的，换字体后记得一并改掉或删除。
