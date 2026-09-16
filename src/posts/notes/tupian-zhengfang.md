---
date: 2026-08-20
collection: notes
---

# 五张图：列表里是正方形

列表页会给每篇文章抓正文里的前五张图，做成缩略图排在标题下面。正好五张时强制正方形——五格正方形就是这一排的宽度上限，所以不管原图什么比例，整排宽度恒定，不会把列表撑乱。

超过五张的图不参与缩略图：用不上，连地址都不会生成。

![示例图一](/mdimgs/demo/square-1.jpg)

![示例图二](/mdimgs/demo/square-2.jpg)

![示例图三](/mdimgs/demo/square-3.jpg)

![示例图四](/mdimgs/demo/square-4.jpg)

![示例图五](/mdimgs/demo/square-5.jpg)

图放在 `src/mdimgs/`，正文里写 `/mdimgs/...` 的绝对路径。走 OSS 构建时这些地址会换成对象存储域名，并挂上现场缩放的参数，本地不落任何缩略图文件。
