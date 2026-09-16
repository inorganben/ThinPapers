---
date: 2026-08-30
---

# 全站排版检查

这篇文章用来检查全站排版：标题、列表、引用、代码、公式在各主题下的呈现效果。

## 数学公式

行内小公式直接随文字排布，如二次方程求根 $x = \frac{-b \pm \sqrt{d}}{2a}$。

行内的大公式（矩阵等）整块居中、与文字中线对齐，比如这个 $A = \begin{pmatrix} 2 & 0 \\ 0 & 3 \end{pmatrix}$ 对角矩阵，不挤压上下行。

块级公式独占一行、水平垂直居中：

$$
\det(A - \lambda I) = \begin{vmatrix} 2-\lambda & 0 \\ 0 & 3-\lambda \end{vmatrix} = (2-\lambda)(3-\lambda) = 0
$$

## 列表

- 无序列表第一项
- 第二项，包含一段 `行内代码`
- 第三项

1. 有序列表第一项
2. 第二项

## 引用

> 简单的力量不在于做的更少，
> 而是把每一处都做得恰到好处。

## 代码块

```js
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
};
```

## 主题一致性

米黄主题下页面底色贴近米白、卡片略亮一档；浅绿主题下整体换绿色调，顶栏磨砂同步变色。字号随屏幕等比缩放，一行恒定 42 个汉字。
