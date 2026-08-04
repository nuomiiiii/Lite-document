# Komari Lite 文档

![Komari Lite](public/assets/komari-banner.svg)

这是 [nuomiiiii/komari](https://github.com/nuomiiiii/komari) 的独立中文手册，基于 VitePress 构建。

在线访问：[nuomiiiii.github.io/komari-document](https://nuomiiiii.github.io/komari-document/)

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

GitHub Pages 构建使用 `DOCS_BASE=/komari-document/`；其他根域名部署保持默认 `/`。

## 内容口径

- 稳定版内容以 `2.1.12` 为基线。
- 本轮快照验证的功能均已转为 `2.1.12` 正式版内容，不再标记为快照功能。
- 与上游行为一致的功能会明确写明一致；仅兼容数据或接口的功能会注明兼容范围；Lite 差异会单独标注。
- 当前 `nuomiiiii/komari-agent` 与上游官方 Agent 的协议和默认行为一致，但仓库、二进制与更新源仍以 `nuomiiiii` 分支为准。
