---
layout: home

hero:
  name: "Komari Lite"
  text: "服务器监控与远程管理手册"
  tagline: 面向 Komari Lite 分支的安装、升级、数据库、流量、远程终端、主题与安全配置说明。
  image:
    src: /assets/komari-icon.svg?v=3
    alt: Komari Lite
  actions:
    - theme: brand
      text: 开始部署
      link: /guide/start
    - theme: alt
      text: 从旧版本升级
      link: /install/update

features:
  - title: 部署与升级
    details: Docker、Linux 脚本、二进制安装，以及数据迁移、备份和回退注意事项。
  - title: 仪表盘配置
    details: 预制布局、模块开关与排序、卡片宽度、刷新频率和 Top 排行口径。
  - title: 数据与性能
    details: 解释监控数据库、分层保留、备份、迁移进度、WAL 与空间回收。
  - title: Agent 全生命周期
    details: 安装、状态检查、日志排查、在线配置、更新、重启和安全卸载。
  - title: 流量与通知
    details: 统一说明限额、重置日、计费流量、日报周报月报、默认配置和告警静默。
  - title: 远程管理
    details: Agent 接入、远程终端、文件管理、任务下发和反向代理兼容要求。
  - title: HTTPS 与安全
    details: 内置 HTTPS、Nginx、Cloudflare Tunnel、2FA 与凭据保护的实际配置方式。
  - title: 主题与接口
    details: 主题安装、公共数据兼容、主题市场，以及开发时需要保持的字段约定。
---

<div class="version-note"><strong>当前口径</strong><span>手册以 Komari Lite 2.2.3 正式版为基线；后续快照差异以对应 Release 标注为准。</span></div>
