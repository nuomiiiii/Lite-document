# Komari Lite 文档

![Komari Lite](public/assets/komari-banner.svg)

这是 [nuomiiiii/komari](https://github.com/nuomiiiii/komari) 的独立中文手册，基于 VitePress 构建。

在线访问：[lite.komari.wiki](https://lite.komari.wiki/)

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

GitHub Pages 构建会根据当前 Pages 域名自动设置资源基础路径；主域名使用 `/`，仓库路径部署使用 `/komari-document/`。

## 内容口径

- 稳定版内容以 `2.2.1` 为基线。
- 已转正功能按 `2.2.1` 的实际行为说明；尚未发布的快照功能不混入稳定版口径。
- 与上游行为一致的功能会明确写明一致；仅兼容数据或接口的功能会注明兼容范围；Lite 差异会单独标注。
- 当前 `nuomiiiii/komari-agent` 与上游官方 Agent 的协议和默认行为一致，但仓库、二进制与更新源仍以 `nuomiiiii` 分支为准。
