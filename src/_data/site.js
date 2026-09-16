module.exports = {
  name: "ThinPapers",
  description: "薄纸几张，写点东西。",
  // 备案信息：留空则页脚不显示这一行（海外部署不需要）
  icp: "",
  icpUrl: "https://beian.miit.gov.cn/",
  // 可扩展的主题列表：新增主题时在 style.css 里加一组同名 [data-theme] 变量，
  // 并在此处按期望的色条顺序登记
  themes: [
    { id: "cream", name: "米黄" },
    { id: "green", name: "浅绿" },
    { id: "sky", name: "天蓝" },
    { id: "purple", name: "浅紫" },
    { id: "dark", name: "深色" },
  ],
  // 主页社交链接（按展示顺序）：图标放 src/images/，url 改成自己的即可
  social: [
    { name: "GitHub", icon: "/images/github.svg", url: "https://github.com/" },
    { name: "Gmail", icon: "/images/gmail.svg", url: "mailto:you@example.com" },
    { name: "Outlook", icon: "/images/selfhst--microsoft-outlook-dark.svg", url: "mailto:you@outlook.com" },
    { name: "Bilibili", icon: "/images/bilibili.svg", url: "https://space.bilibili.com/" },
    { name: "X", icon: "/images/x.svg", url: "https://x.com/" },
  ],
};
