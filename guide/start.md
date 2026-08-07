# 快速开始

这份手册面向 Komari Lite [**nuomiiiii/komari**](https://github.com/nuomiiiii/komari)，不是上游 `komari-monitor/komari` 的原样镜像。

安装脚本、Docker 镜像、数据库迁移和后台功能均以本分支为准。

当前配套 Agent 与上游官方 Agent 的协议和默认行为一致，但下载仓库、二进制与更新源以 `nuomiiiii/komari-agent` 为准。

手册中提到上游或官方实现时，会明确说明是“行为一致”“仅兼容指定范围”还是“Lite 存在差异”；没有明确结论的内容不应自行推断为完全相同。

## 先选择部署方式

| 场景 | 推荐方式 | 说明 |
| --- | --- | --- |
| 已经使用 Docker 或 1Panel | [Docker 部署](/install/docker) | 更新和回退最直观，务必持久化 `data` |
| 常见 Linux + systemd | [Linux 脚本安装](/install/linux) | 自带安装、更新、服务管理菜单 |
| Windows 或特殊架构 | [二进制安装](/install/binary) | 手动管理进程与数据目录 |

默认 Web 端口为 `25774`。首次打开 `http://服务器地址:25774` 后，按照初始化页面创建管理员账号。未初始化时即使先访问公开大屏，也会自动进入初始化流程。

::: warning 初次安装默认不会强制 HTTPS
HTTP 自动跳转默认关闭。先确认面板可以正常访问，再配置反向代理或内置 HTTPS，避免证书或端口错误导致无法进入后台。
:::

## 第一次登录后建议完成

1. 在“账户与安全”中启用两步验证。
2. 在“服务器”中添加节点并复制 Agent 安装参数。
3. 配置数据保留天数、流量限额和流量重置日。
4. 测试通知渠道，再启用离线、流量或延迟告警。
5. 完整备份一次 `data` 目录，并确认备份可以下载。
6. 为公网面板配置 HTTPS。
7. 在“外观与主题 → 主题管理”确认公开大屏主题可用；系统必须至少保留一个主题。

## 常用入口

- 版本发布：[GitHub Releases](https://github.com/nuomiiiii/komari/releases)
- Agent：[nuomiiiii/komari-agent](https://github.com/nuomiiiii/komari-agent)

下一步：[使用 Docker 部署](/install/docker) 或 [使用 Linux 脚本安装](/install/linux)。
