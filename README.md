# Lite 文档

![Lite](public/assets/lite-banner.svg)

这是 [nuomiiiii/lite](https://github.com/nuomiiiii/lite) 的独立中文手册，基于 VitePress 构建。

在线访问：[https://nuomiiiii.github.io/Lite-document/](https://nuomiiiii.github.io/Lite-document/)

## 本地运行

```bash
pnpm install
pnpm docs:dev
```

## 构建

```bash
pnpm docs:build
```

构建产物位于 `.vitepress/dist`。

GitHub Pages 构建会根据当前 Pages 域名自动设置资源基础路径；仓库路径部署使用 `/Lite-document/`。

## 内容口径

- 当前内容以即将发布的 Lite `2.3.2`、已发布的 Lite-agent `2.3.1.0` 和 Lite-Theme `1.0.9` 为基线。
- Lite `2.3.2` 发布前，标注为该版本的新功能不会出现在 `2.3.1` 正式版中；Agent 与主题内容按已发布版本说明。
- 与上游行为一致的功能会明确写明一致；仅兼容数据或接口的功能会注明兼容范围；Lite 差异会单独标注。
- 当前配套 Agent 使用独立的 [`nuomiiiii/Lite-agent`](https://github.com/nuomiiiii/Lite-agent) 仓库、`Lite-agent` 二进制和更新源。
- Agent 页面覆盖安装、状态、日志、更新、重启、卸载和凭据保留，不再只提供安装命令。
