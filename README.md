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

- 稳定版内容以 Lite `2.3.1`、Lite-agent `2.3.0.1` 和 Lite-Theme `1.0.5` 为基线。
- 已转正功能按正式版本的实际行为说明；尚未发布的快照功能不混入稳定版口径。
- 与上游行为一致的功能会明确写明一致；仅兼容数据或接口的功能会注明兼容范围；Lite 差异会单独标注。
- 当前配套 Agent 使用独立的 [`nuomiiiii/Lite-agent`](https://github.com/nuomiiiii/Lite-agent) 仓库、`Lite-agent` 二进制和更新源。
- Agent 页面覆盖安装、状态、日志、更新、重启、卸载和凭据保留，不再只提供安装命令。
