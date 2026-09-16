# 部署

站点是纯静态的，`npm run build` 产出的 `_site/` 拷到任何地方都能跑。下面两段是这套模板作者在用的方案，可以照抄也可以只挑一半。

## 1. 图片走阿里云 OSS（可选）

图片留在仓库里直接随站点发布也行，但高分辨率原图会让仓库和服务器都变重，所以这套模板把 `src/mdimgs/` 交给 OSS，并把缩略图的缩放工作也交给 OSS 的图片处理（不生成任何本地缩略图文件）。

```bash
# 装 ossutil 并配好 ak/sk 之后，增量同步图片（只传新的/改过的）
ossutil cp -r -u src/mdimgs/ oss://<bucket>/mdimgs/

# 构建时注入 OSS 域名：只有 /mdimgs/ 路径会被替换，站内图标/字体不受影响
OSS_BASE=https://<bucket>.<region>.aliyuncs.com npm run build:oss
```

注意两点：

- `OSS_BASE` 留空就是本地构建（`npm run build`），图片仍走 `/mdimgs/`，适合本地开发；
- OSS 上的文件得开**公共读**（或给站点配 CDN 回源），否则页面里的图片地址会 403。

缩略图用的处理参数写在 `eleventy.config.js` 的 `THUMB_PROCESS`：`image/resize,w_400/quality,q_58`，实测一张 973KB 的扫描件缩到 15KB。

## 2. 发布到自己的服务器

`tar` 管道直接覆盖远端目录，比 rsync 少一层依赖；同时把文件权限刷成 644/755（tar 解出来的权限跟随 umask，容易出错）。

```bash
tar --no-xattrs -C _site -cf - . | ssh root@<host> \
  'rm -rf /var/www/<site> && mkdir -p /var/www/<site> \
   && tar -C /var/www/<site> -xf - \
   && find /var/www/<site> -type f -exec chmod 644 {} + \
   && find /var/www/<site> -type d -exec chmod 755 {} +'
```

nginx 侧的站点配置见同目录的 [`nginx.conf.example`](nginx.conf.example)：目录式 URL、gzip、静态资源长缓存、HTML 不缓存。证书可以用 certbot 签，也可以像示例里那样放固定路径。

## 3. 用 GitHub Pages / Cloudflare Pages 之类的托管

不需要服务器，构建命令 `npm run build`，产物目录 `_site`。要注意 Pages 场景下图片最好还是走 OSS 或图床，不然仓库会越来越胖。

## 部署前检查清单

- 文章日期写成 `YYYY-MM-DD`（月日补零）。写错的日期 Eleventy 解析不出来，那篇文章会**静默不生成**，页面上什么都不报。
- 新图先跑 `python3 scripts/compress.py --convert` 压到 1MB 以内再提交。
- 改了中文字体或新增了大量汉字，重跑 `npm run font`。
