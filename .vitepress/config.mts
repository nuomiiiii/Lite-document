import { defineConfig } from "vitepress";

const base = process.env.DOCS_BASE || "/";

const sidebar = [
  {
    text: "开始使用",
    items: [
      { text: "快速开始", link: "/guide/start" },
      { text: "版本与功能范围", link: "/guide/versioning" },
    ],
  },
  {
    text: "服务端部署",
    items: [
      { text: "Docker 部署", link: "/install/docker" },
      { text: "Linux 脚本安装", link: "/install/linux" },
      { text: "二进制安装", link: "/install/binary" },
      { text: "更新与数据库迁移", link: "/install/update" },
    ],
  },
  {
    text: "Agent 节点",
    items: [
      { text: "安装与维护", link: "/install/agent" },
      { text: "Agent 自动发现", link: "/install/agent-ad" },
      { text: "接入与配置", link: "/remote/agent" },
      { text: "远程终端与文件", link: "/remote/terminal" },
    ],
  },
  {
    text: "后台使用",
    items: [
      { text: "仪表盘", link: "/admin/dashboard" },
      { text: "服务器管理", link: "/admin/servers" },
      { text: "监测与回程", link: "/admin/monitoring" },
      { text: "流量与报告", link: "/admin/traffic" },
      { text: "通知与告警", link: "/admin/notifications" },
    ],
  },
  {
    text: "数据与存储",
    items: [
      { text: "数据库与空间维护", link: "/data/storage" },
      { text: "备份、导入与迁移", link: "/data/backup" },
    ],
  },
  {
    text: "访问与安全",
    items: [
      { text: "内置 HTTPS", link: "/security/https" },
      { text: "反向代理与 Tunnel", link: "/security/reverse-proxy" },
    ],
  },
  {
    text: "主题与开发",
    items: [
      { text: "主题管理", link: "/themes/" },
      { text: "主题开发", link: "/development/theme" },
      { text: "API 与 RPC2", link: "/development/api" },
      { text: "Agent RFC", link: "/development/agent-rfc" },
      { text: "兼容与公共接口", link: "/development/compatibility" },
    ],
  },
  {
    text: "排查问题",
    items: [{ text: "常见问题", link: "/faq/" }],
  },
];

export default defineConfig({
  base,
  lang: "zh-CN",
  title: "Komari Lite 文档",
  description: "nuomiiiii/komari 安装、升级、管理与开发手册",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}assets/komari-icon.svg?v=3` }],
    ["meta", { name: "theme-color", content: "#087f73" }],
  ],
  markdown: {
    image: { lazyLoading: true },
  },
  themeConfig: {
    logo: "/assets/komari-icon.svg?v=3",
    siteTitle: "Komari Lite 文档",
    nav: [
      { text: "首页", link: "/" },
      { text: "快速开始", link: "/guide/start" },
      { text: "Agent 运维", link: "/install/agent" },
      { text: "使用指南", link: "/admin/dashboard" },
      { text: "开发指南", link: "/development/api" },
      { text: "常见问题", link: "/faq/" },
      { text: "GitHub", link: "https://github.com/nuomiiiii/komari" },
    ],
    sidebar,
    outline: { label: "本页目录", level: [2, 3] },
    docFooter: { prev: "上一页", next: "下一页" },
    lastUpdated: { text: "最后更新" },
    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "搜索文档", buttonAriaLabel: "搜索文档" },
          modal: {
            displayDetails: "显示详细列表",
            resetButtonTitle: "清除查询",
            backButtonTitle: "关闭搜索",
            noResultsText: "没有找到相关内容",
            footer: { selectText: "选择", navigateText: "切换", closeText: "关闭" },
          },
        },
      },
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/nuomiiiii/komari" },
    ],
    footer: {
      message: "基于 MIT 许可证发布",
      copyright: "Komari Lite 文档 · 部分结构参考上游项目",
    },
  },
});
