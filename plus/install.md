# 部署与从 Lite 升级 <PlusBadge />

本页仅适用于 Lite-Plus。监控、告警与远程管理的共用操作仍可查阅原手册；安装时请使用 Plus 自己的脚本、镜像和 Release。

## 部署参数

| 项目 | Lite | Lite-Plus 新安装 |
| --- | --- | --- |
| 服务端镜像 | `ghcr.io/nuomiiiii/lite` | `ghcr.io/nuomiiiii/lite-plus` |
| 默认 HTTP 端口 | `27777` | `28777` |
| 默认 HTTPS 端口 | `36888` | `37888`，启用后才监听 |
| Linux 服务 | `lite` | `lite-plus` |
| Linux 安装目录 | `/opt/lite` | `/opt/lite` |
| 容器内程序 / 数据 | `/app/Lite`、`/app/data` | `/app/Lite`、`/app/data` |
| 配套 Agent | Lite-agent | Lite-Plus-agent |

从已有 Lite 数据目录升级会保留原来实际使用的监听端口及 HTTPS 设置，不会因为 Plus 的新安装默认值而自动改端口。显式的 `-l` 或 `LITE_LISTEN` 继续优先。

## Linux 安装

systemd 主机复制一行下载并运行：

```sh
curl -fsSL https://raw.githubusercontent.com/nuomiiiii/Lite-Plus/main/install-lite.sh -o install-lite-plus.sh && sudo sh install-lite-plus.sh
```

OpenWrt / iStoreOS 以 root 登录后使用：

```sh
wget -O install-lite-plus.sh https://raw.githubusercontent.com/nuomiiiii/Lite-Plus/main/install-lite.sh && sh install-lite-plus.sh
```

新安装默认访问 `http://服务器地址:28777`，按原有安装引导创建管理员和站点。已通过脚本部署到 `/opt/lite` 的 Lite 实例，先停止并备份原程序和完整数据，再运行 Plus 脚本选择“升级”，沿用原端口与数据。脚本会把旧 `lite` 服务迁为 `lite-plus`。

systemd 日常维护：

```sh
sudo systemctl status lite-plus
sudo systemctl restart lite-plus
sudo journalctl -u lite-plus -f
```

procd 日常维护：

```sh
/etc/init.d/lite-plus status
/etc/init.d/lite-plus restart
logread -e lite-plus
```

## Docker 新安装

以下为完整 Compose 文件，可直接用于 Docker Compose 或 1Panel 编排。固定容器名为 `lite-plus`：

```yaml
services:
  lite-plus:
    image: ghcr.io/nuomiiiii/lite-plus:0.1.2
    container_name: lite-plus
    restart: unless-stopped
    ports:
      - "28777:28777"
    volumes:
      - ./data:/app/data
    environment:
      TZ: Asia/Shanghai
```

在文件所在目录执行：

```sh
docker compose up -d
```

访问 `http://服务器地址:28777`。需要跟随当前正式版时，可将标签改为 `latest`。使用内置 HTTPS 时，另加 `37888:37888` 映射，并配置证书；独立订阅端口也需单独映射。

## Docker 从 Lite 升级

1. 停止原 Lite 容器，备份原程序信息及完整宿主机 `data` 目录；外部监控数据库另外备份。
2. 在原编排中将镜像改为 `ghcr.io/nuomiiiii/lite-plus:0.1.2`。
3. 保持原有 `data` 挂载、端口、环境变量和证书挂载，沿用原入口重新创建容器。
4. 确认原账号、节点、历史数据和 HTTPS 可用，再进入新增的“节点管理”。

升级只替换镜像时，不要同时照搬新安装示例的 `28777:28777`。旧数据可能仍监听 `27777` 或自定义端口，映射必须与实际监听一致。原来以 `27777:27777` 部署的实例，可明确保留以下配置：

```yaml
ports:
  - "27777:27777"
environment:
  LITE_LISTEN: "0.0.0.0:27777"
```

把这些项合并到原服务，其他配置继续沿用。不要同时运行 Lite 和 Plus 写入同一目录；回退时恢复升级前的程序及完整备份，不能假定旧 Lite 可以直接读取 Plus 修改后的数据。

## 二进制部署

从 [Lite-Plus Releases](https://github.com/nuomiiiii/Lite-Plus/releases) 下载系统和架构匹配的产物。服务端资产仍使用 `Lite-<系统>-<架构>` 命名，例如：

```sh
chmod +x Lite-linux-amd64 && ./Lite-linux-amd64 server -l 0.0.0.0:28777
```

Windows 下载对应产物后，在 PowerShell 中运行：

```powershell
.\Lite-windows-amd64.exe server -l 0.0.0.0:28777
```

升级已有实例时，保留原工作目录和实际监听参数。

## 安装或迁移 Plus Agent

节点管理需要 Lite-Plus-agent，当前项目基线为 `0.0.2.4`。先在 Plus“服务器 → 节点配置 → 部署指令”选择系统与安装选项，再复制完整命令执行；不要使用 Lite-agent 的下载源代替。

| 项目 | 默认值 |
| --- | --- |
| Linux 服务名 | `lite-plus-agent` |
| Linux 安装目录 | `/opt/lite-plus-agent` |
| 程序 | `/opt/lite-plus-agent/Lite-Plus-agent` |
| Docker 镜像 | `ghcr.io/nuomiiiii/lite-plus-agent:0.0.2.4` |

已有 Lite-agent 时，在原节点执行 Plus 后台为**原节点**生成的部署指令，保留原节点 Token 与面板地址。默认布局可迁入 Plus 目录与服务名；自定义目录、服务名和证书挂载应按原部署核对。

仍使用上游 komari-agent，且服务端已迁到 Plus 时，可保留原身份执行 Plus 的迁移脚本：

```sh
curl -fsSL https://raw.githubusercontent.com/nuomiiiii/Lite-Plus-agent/main/migrate.sh -o migrate-lite-plus-agent.sh && sudo bash migrate-lite-plus-agent.sh
```

主控地址发生变化时，在执行脚本的末尾追加 `--endpoint "https://新的主控地址"`。不要传入新的 Token。Docker 节点保留 endpoint、Token 和状态目录挂载，改用 Plus Agent 镜像重新创建容器。

节点管理的配置通道与浏览器远程终端分开。需要防火墙、入站联动放行、终端、文件、远程执行或 MCP 时，仍按共用手册同时开启站点和 Agent 远程控制开关并完成授权。防火墙还需 Agent 具备管理主机规则的权限，见[服务器防火墙](/plus/firewall)。

## 备份与更新

Plus 节点管理配置、节点出站地址族、防火墙配置、用户、套餐、订阅、订阅模板及其绑定、计量记录保存在主数据库中。根域名证书的证书链和加密私钥也保存在主库中，应连同实例密钥使用完整备份保存。面板复用根证书导出的文件位于 `data/tls/root/`，随完整数据目录备份。

“主控申请”由 Agent 生成的节点私钥、节点外部证书文件和 Agent 本地状态仍需单独备份。外部监控数据库也需单独备份。后续服务端更新使用 Plus 的 Release 或镜像，Agent 更新使用 Plus-agent 仓库；共用的检查与回退步骤见[更新与数据库迁移](/install/update)。

升级后重点检查：

- 根证书及单节点主控申请证书的“自动续签”状态，核对签发凭据是否仍有效。
- 使用 HTTP 入站时，确认 Agent 已支持入站账号，再检查账号密码与节点应用结果。
- Shadowsocks SS2022 重新导入完整订阅或分享链接；修改出站协议后核对对应凭据。
- 订阅的“对外地址”是否为实际访问地址，泛域名证书应填写具体订阅主机名。开关“复用内置 HTTPS”不会自动补全此值。
- 配置非零订阅监听端口后，面板 HTTP / HTTPS 入口不再提供订阅。出现 `404` 时，检查订阅反向代理是否回源到独立端口，见[配置订阅入口](/plus/subscriptions#配置订阅入口)。
- 服务端与后台更新到 `0.1.2`，配套 Agent 更新到 `0.0.2.4`，核对 Shadowsocks 入站与出站的 TCP / UDP 网络选项；sing-box UDP 分片默认关闭，按需开启。
- 在“远程管理 → 防火墙”检查后端与下发状态；需要联动入站放行时，检查站点及 Agent 远程控制和身份验证。已有主机默认拒绝规则时，也要从外部验证端口可达。
- 在“节点管理 → 概览”核对出站地址族，默认“双栈”；非默认值会覆盖出站单独设置的直连域名策略。
- 需要在客户端显示订阅名称、流量和期限时，到“入口管理”分别打开对应开关，默认都关闭。
- 面板需要使用“签发管理”的根证书时，在内置 HTTPS 点击“复用根域名证书”；根证书续签后再次复用以刷新文件。
- 配套 Agent 包含限速单位、双向流量计量、真实在线 IP 和路由匹配修复。更新后核对用户速率、上下行已用量、在线 IP 及分流结果；规则中域名和 IP 同时填写时需同时命中。
- 核对入站、出站、路由和订阅的启用状态；保存关闭状态后，这些配置会继续保持关闭。
