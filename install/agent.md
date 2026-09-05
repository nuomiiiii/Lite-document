# Agent 安装与维护

当前已发布版本为 Lite-agent `2.3.1.0`。请配合 Lite `2.3.1` 或更高版本使用；Lite `2.3.2` 发布后建议升级到该版本组合。Agent 使用独立更新源和 Lite 安装目录，并通过 WebSocket 心跳、读超时和快速重连降低进程运行但面板显示离线的概率。

本页覆盖 Agent 的安装、状态检查、日志、重启、更新和卸载。节点配置与在线下发见 [Agent 接入与配置](/remote/agent)，批量部署见 [Agent 自动发现](/install/agent-ad)。

## 安装前确认

单台服务器应先在 Lite 后台添加节点，再打开该节点的“节点配置”并切换到“部署指令”。选择目标系统和安装选项后，点击“保存并复制部署指令”，生成的命令已经包含面板地址、节点 Token 和所选安装参数。

Linux 安装脚本的默认值如下：

| 项目 | 默认值 |
| --- | --- |
| 服务名 | `lite-agent` |
| 安装目录 | `/opt/lite-agent` |
| 程序路径 | `/opt/lite-agent/Lite-agent` |
| 运行用户 | `root` |

如果安装时使用了 `--install-service-name` 或 `--install-dir`，后续命令必须替换为实际服务名和目录。

## 安装 Agent

### Linux 和 macOS

推荐直接执行后台生成的命令。需要手工安装时，可下载脚本后运行：

```bash
curl -fsSL https://raw.githubusercontent.com/nuomiiiii/Lite-agent/main/install.sh -o install-lite-agent.sh
sudo bash install-lite-agent.sh \
  --endpoint "https://example.com" \
  --token "你的-Agent-Token" \
  --enable-remote-control=false
```

安装脚本会识别 systemd、OpenRC、OpenWrt procd、macOS launchd 或 Upstart，并创建对应服务。新安装默认关闭远程控制；需要使用远程终端、文件管理或远程执行时，将最后一项改为 `--enable-remote-control`，并同时在 Lite 后台开启“允许远程管理”。

脚本再次运行时会替换原服务和程序，适合更新或修改必须重装才能生效的安装参数。从旧 `komari-agent` 安装迁移时，会保留可识别的节点身份、自动发现凭据、流量状态、配置和原有远程控制状态。

FreeBSD 请从 [Agent Releases](https://github.com/nuomiiiii/Lite-agent/releases) 下载对应架构的二进制，按 [JSON 配置](/remote/agent#json-配置)启动，并自行配置系统服务。当前脚本不会自动创建 FreeBSD 原生 rc.d 服务。

::: danger 保护节点凭据
Agent Token、Cloudflare Access Service Token 和 `auto-discovery.json` 都属于敏感凭据。不要把完整安装命令、服务启动参数或日志原样贴到公开工单。
:::

### Docker

Docker 用户应优先使用后台生成的 `docker run` 或 Compose 配置。默认拉取 `latest`：

```bash
docker pull ghcr.io/nuomiiiii/lite-agent:latest
```

需要固定当前正式版时使用：

```bash
docker pull ghcr.io/nuomiiiii/lite-agent:2.3.1.0
```

镜像地址必须使用小写 `lite-agent`；如果后台生成的命令中仍是 `Lite-agent`，请先改为上述小写地址，否则 Docker 会拒绝执行。

自动发现部署必须把 `/app/auto-discovery.json` 持久化到宿主机，并确保每个容器使用独立文件，完整示例见 [Agent 自动发现](/install/agent-ad#docker)。Docker Agent 不会在容器内替换自身程序，更新时必须拉取新镜像并重建容器。

### Windows

在管理员 PowerShell 中执行后台生成的安装命令。脚本默认安装到：

```text
C:\Program Files\Lite
```

默认服务名为 `lite-agent`，由 NSSM 管理并设置为自动启动。

## 查看当前状态

### systemd

```bash
sudo systemctl is-enabled lite-agent
sudo systemctl is-active lite-agent
sudo systemctl status lite-agent --no-pager -l
```

正常情况下，服务应同时显示 `enabled` 和 `active`。状态页中的启动命令还能帮助确认面板地址、安装路径和是否使用了自定义参数；对外分享前请遮盖 Token。

### Docker

```bash
docker ps --filter name=lite-agent
docker inspect --format '{{.State.Status}} / restart={{.RestartCount}}' lite-agent
```

容器状态为 `running` 只表示进程存在，还应在 Lite 后台确认节点在线、最后上报时间持续更新。

### OpenRC 与 OpenWrt

```bash
sudo rc-service lite-agent status
```

OpenWrt procd：

```bash
/etc/init.d/lite-agent status
```

### Windows

```powershell
Get-Service -Name lite-agent
$nssm = (Get-Command nssm -ErrorAction SilentlyContinue).Source
if (-not $nssm) { $nssm = Join-Path $env:ProgramFiles "Lite\nssm.exe" }
& $nssm status lite-agent
```

### macOS

系统级安装：

```bash
sudo launchctl print system/com.lite.lite-agent
```

用户级安装：

```bash
launchctl print "gui/$(id -u)/com.lite.lite-agent"
```

## 查看日志

### systemd

最近 100 行：

```bash
sudo journalctl -u lite-agent -n 100 --no-pager
```

持续查看：

```bash
sudo journalctl -u lite-agent -f
```

只看最近 30 分钟：

```bash
sudo journalctl -u lite-agent --since "30 minutes ago" --no-pager
```

如果使用了自定义服务名，请把命令中的 `lite-agent` 替换为实际名称。

### Docker

```bash
docker logs --tail 100 lite-agent
docker logs -f lite-agent
```

### OpenRC、OpenWrt 与 macOS

OpenRC 不固定日志文件位置，需按系统实际使用的 syslog 服务查看；Alpine 常见方式是先检查 `/var/log/messages`，或使用系统已经配置的日志命令。

OpenWrt 可查看系统日志：

```bash
logread -e lite-agent
logread -f
```

macOS 安装脚本会把标准输出和错误写入以下文件之一：

```text
/var/log/lite-agent.log
~/Library/Logs/lite-agent.log
```

```bash
tail -n 100 /var/log/lite-agent.log
```

用户级安装请改用 `$HOME/Library/Logs/lite-agent.log`。

### Windows

Windows 安装脚本默认不会创建独立的 Agent 文本日志。先用 `Get-Service` 和 Lite 后台的最后上报时间判断状态；服务启动失败时，再查看“事件查看器 → Windows 日志 → 应用程序”中的 NSSM 或服务错误。

::: warning 分享日志前先脱敏
删除面板域名、IP、Agent Token、自动发现密钥、Cloudflare Access 凭据和完整启动参数。不要为了排查而关闭 TLS 校验或把 Token 改回 URL 参数。
:::

## 根据日志排查

| 现象 | 优先检查 |
| --- | --- |
| `401` 或 `403` | 面板地址是否指向正确实例、Token 是否与当前节点匹配、Cloudflare Access 凭据是否成对配置 |
| 证书或 `x509` 错误 | 域名是否匹配证书、证书链是否完整、服务器时间是否正确 |
| `connection refused` | 面板端口是否监听、防火墙和反向代理是否指向正确端口 |
| DNS 或超时 | Agent 所在节点能否解析并访问面板域名，自定义 DNS 和 IPv4/IPv6 偏好是否合适 |
| 服务反复重启 | 查看最早出现的参数、权限或配置文件错误，不要只截取最后一行 |
| 进程运行但面板离线 | 先核对 Lite 与 Lite-agent 是否为手册列出的兼容组合，再检查 WebSocket 和代理超时 |
| 在线但流量或磁盘缺失 | 检查包含/排除网卡、挂载点和采集间隔，确认没有把实际设备过滤掉 |
| 配置停在“已发送” | 确认 Agent 在线且版本支持配置回执；查看日志中的配置应用失败原因 |

当前配套 Lite-agent 使用 WebSocket 心跳、读超时和快速重连。更新后仍频繁离线时，应继续检查反向代理、Cloudflare Access、DNS 和网络路径，不要靠定时重启掩盖问题。

## 重启与更新

### systemd

```bash
sudo systemctl restart lite-agent
sudo systemctl status lite-agent --no-pager -l
```

更新可在 Lite 后台发起，也可以重新执行当前节点的完整安装命令。重新运行脚本会替换程序和服务配置，但不会主动删除安装目录中的 `auto-discovery.json`、`net_static.json` 等数据文件，也会保留升级前的远程控制状态。新安装默认关闭远程控制，不代表已有节点升级后会被自动关闭。

### Docker

```bash
docker pull ghcr.io/nuomiiiii/lite-agent:latest
```

拉取后使用原来的参数、卷挂载和重启策略重建容器。不要为了更新而删除持久化的 `auto-discovery.json`。

### OpenRC、OpenWrt、Windows 与 macOS

```bash
sudo rc-service lite-agent restart
```

```bash
/etc/init.d/lite-agent restart
```

```powershell
Restart-Service -Name lite-agent
```

```bash
# macOS 系统级安装
sudo launchctl kickstart -k system/com.lite.lite-agent

# macOS 用户级安装
launchctl kickstart -k "gui/$(id -u)/com.lite.lite-agent"
```

## 卸载 Agent

卸载系统服务不会自动删除 Lite 后台中的服务器记录。确认该节点不再使用后，再决定是否从后台删除服务器。

### 一键完全卸载（默认 systemd 安装）

确认不再需要恢复节点身份后，可复制并执行下面这一条命令。它会停止并删除默认的 `lite-agent` 服务，同时永久删除 `/opt/lite-agent` 中的程序、Agent Token、自动发现凭据和本地流量状态：

```bash
sudo sh -eu -c 'if [ "$(systemctl show -p LoadState --value lite-agent.service)" != "not-found" ]; then systemctl disable --now lite-agent.service; fi; rm -f /etc/systemd/system/lite-agent.service; systemctl daemon-reload; systemctl reset-failed lite-agent.service 2>/dev/null || true; rm -rf -- /opt/lite-agent'
```

::: danger 执行后无法恢复节点凭据
这条命令只适用于默认服务名 `lite-agent` 和默认安装目录 `/opt/lite-agent`。使用过 `--install-service-name` 或 `--install-dir` 时不要直接执行，请按下面的分步方式替换为实际值。
:::

### systemd

先移除服务：

```bash
sudo systemctl disable --now lite-agent
sudo rm -f /etc/systemd/system/lite-agent.service
sudo systemctl daemon-reload
sudo systemctl reset-failed lite-agent.service
```

这时 `/opt/lite-agent` 仍保留节点凭据和流量文件。确认不再需要恢复原节点身份后，才执行完整清理：

```bash
sudo rm -rf /opt/lite-agent
```

::: danger 完整清理不可恢复
删除安装目录会同时删除 Agent 程序、自动发现凭据和本地流量状态。准备重装并继续使用原节点时，应保留 `auto-discovery.json`；需要保留本地流量周期时，还应备份 `net_static.json`。
:::

### Docker

```bash
docker stop lite-agent
docker rm lite-agent
```

以上命令不会删除宿主机持久化文件。确认不再需要节点身份后，再手工删除对应的 `auto-discovery.json`；不要误删其他容器共用目录。

### OpenRC 与 OpenWrt

```bash
sudo rc-service lite-agent stop
sudo rc-update del lite-agent default
sudo rm -f /etc/init.d/lite-agent
```

OpenWrt：

```bash
/etc/init.d/lite-agent stop
/etc/init.d/lite-agent disable
rm -f /etc/init.d/lite-agent
```

确认无需保留凭据后，再删除实际安装目录。

### Windows

在管理员 PowerShell 中执行：

```powershell
$nssm = (Get-Command nssm -ErrorAction SilentlyContinue).Source
if (-not $nssm) { $nssm = Join-Path $env:ProgramFiles "Lite\nssm.exe" }
& $nssm stop lite-agent
& $nssm remove lite-agent confirm
```

只移除服务会保留 `C:\Program Files\Lite`。确认无需保留节点身份和本地数据后，再删除该目录：

```powershell
Remove-Item -LiteralPath "$env:ProgramFiles\Lite" -Recurse -Force
```

### macOS

系统级服务：

```bash
sudo launchctl bootout system /Library/LaunchDaemons/com.lite.lite-agent.plist
sudo rm -f /Library/LaunchDaemons/com.lite.lite-agent.plist
```

用户级服务：

```bash
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/com.lite.lite-agent.plist"
rm -f "$HOME/Library/LaunchAgents/com.lite.lite-agent.plist"
```

最后确认实际安装目录和凭据是否仍需保留，再决定是否删除 `/usr/local/lite-agent` 或 `$HOME/.lite-agent`。
