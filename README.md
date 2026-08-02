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
- 仍处于快照测试阶段的功能会在页面中明确标注。
- 上游共有功能会保留，但仓库、镜像、Agent 与升级说明均以 `nuomiiiii` 分支为准。
