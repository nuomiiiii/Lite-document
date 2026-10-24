# Lite 文档

![Lite](public/assets/lite-banner.svg)

这是 [Lite](https://github.com/nuomiiiii/lite) 与 [Lite-Plus](https://github.com/nuomiiiii/Lite-Plus) 共用的中文手册，基于 VitePress 构建。Plus 专属页面和内容使用紫色 `PLUS` 徽标，并集中放在 `plus/` 目录。

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

- 当前内容按 Lite `2.3.9` 的当前构建、Lite-agent `2.3.6.3` 和 Lite-Theme `1.2.9` 编写。
- Plus 章节按 Lite-Plus `0.0.1`、Lite-Plus-agent `0.0.0.4` 的当前代码编写，覆盖独立部署、Lite 升级及节点管理功能；共用主题为 Lite-Theme `1.2.9`。
- 与上游行为一致的功能会明确写明一致；仅兼容数据或接口的功能会注明兼容范围；Lite 差异会单独标注。
- 当前配套 Agent 使用独立的 [`nuomiiiii/Lite-agent`](https://github.com/nuomiiiii/Lite-agent) 仓库、`Lite-agent` 二进制和更新源。
- Agent 页面覆盖安装、状态、日志、更新、重启、卸载和凭据保留，不再只提供安装命令。
- MCP 代理页面覆盖客户端接入、服务器授权、访问期限、活动授权编辑、操作记录和撤销；Linux 安装页面同时覆盖 systemd 与 OpenWrt / iStoreOS procd。
- 定时任务页面覆盖四种计划、北京时间、身份确认、立即执行、节点输出和退出码，以及停用与恢复规则。
