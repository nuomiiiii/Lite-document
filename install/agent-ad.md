# Agent 自动发现

自动发现用于批量接入服务器。目标服务器上的 Agent 携带自动发现密钥首次连接后，Komari Lite 会自动创建节点并签发独立凭据，不需要在后台逐台添加节点、复制 Token。

::: info 与上游的关系
本页参考了[上游自动发现文档](https://komari-document.pages.dev/install/agent-ad)，并按 Komari Lite 当前服务端、管理界面和配套 Agent 重新核对。Lite 配套 Agent 的自动注册、凭据保存和再次启动行为与上游官方 Agent 当前实现一致；安装脚本、Docker 镜像、二进制和更新源使用 `nuomiiiii/komari-agent`。
:::

请直接使用当前稳定 Agent `2.2.0.2` 或后续兼容版本。服务端应使用 Komari `2.2.3` 第四次更新或更新的稳定构建，避免节点连接正常却被误判离线。

## 工作方式

1. 管理员在“系统设置 > 通用”生成并保存自动发现密钥。
2. 在服务器列表的“自动发现”区域选择目标平台并复制安装命令。
3. Agent 使用面板地址和自动发现密钥完成首次注册。
4. 面板创建以 `Auto-` 开头的节点，并为该节点签发独立凭据。
5. Agent 将凭据保存到程序目录下的 `auto-discovery.json`，后续重启直接复用，不会重复创建节点。

自动发现密钥只负责首次注册。注册成功后，每台 Agent 使用自己取得的节点凭据连接面板。

## 开启自动发现

进入“系统设置 > 通用”，找到“自动发现密钥”：

1. 点击“生成”，或填写自定义随机密钥。
2. 密钥至少需要 12 个字符，建议使用后台生成的 24 位随机值。
3. 保存设置。
4. 返回服务器列表，在“自动发现”区域选择 Linux、Windows、macOS 或 Docker。
5. 按需展开“安装选项”，然后复制后台生成的命令到目标服务器执行。

后台生成的命令会自动使用当前面板地址；配置了脚本访问域名时，以该地址为准。命令中包含真实自动发现密钥，不要把命令粘贴到公开工单、聊天记录或代码仓库。

## 手动安装命令

推荐优先使用后台生成的命令。下面的示例仅用于需要自行编排部署的情况，请替换：

- `https://komari.example.com`：Komari Lite 的 HTTPS 地址。
- `YOUR_AD_KEY`：后台保存的自动发现密钥。

### Linux

```bash
wget -qO- 'https://raw.githubusercontent.com/nuomiiiii/komari-agent/refs/heads/main/install.sh' | sudo bash -s -- -e 'https://komari.example.com' --auto-discovery 'YOUR_AD_KEY'
```

### macOS

```bash
zsh <(curl -sL 'https://raw.githubusercontent.com/nuomiiiii/komari-agent/refs/heads/main/install.sh') -e 'https://komari.example.com' --auto-discovery 'YOUR_AD_KEY'
```

### Windows

请在管理员 PowerShell 中执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "iwr 'https://raw.githubusercontent.com/nuomiiiii/komari-agent/refs/heads/main/install.ps1' -UseBasicParsing -OutFile 'install.ps1'; & '.\install.ps1' '-e' 'https://komari.example.com' '--auto-discovery' 'YOUR_AD_KEY'"
```

### Docker

```bash
touch .komari-auto-discovery.json && \
docker run -d --name komari-agent --restart=always \
  -v .komari-auto-discovery.json:/app/auto-discovery.json \
  ghcr.io/nuomiiiii/komari-agent:latest \
  -e 'https://komari.example.com' \
  --auto-discovery 'YOUR_AD_KEY'
```

`touch` 不能省略。绑定单个文件前必须先创建宿主机文件，否则 Docker 可能把它创建成目录，Agent 将无法保存凭据。

每个容器必须使用各自独立的 `auto-discovery.json`。不要把同一份文件挂载给多个 Agent，否则它们会复用同一个节点身份。

Docker Agent 不会在容器内替换自身二进制。升级时请拉取新的 `ghcr.io/nuomiiiii/komari-agent` 镜像并重建容器，同时保留上述凭据文件。

## 常用安装选项

服务器列表中的命令生成器支持以下选项：

| 参数 | 作用 | 说明 |
| --- | --- | --- |
| `--disable-web-ssh` | 禁用远程控制 | 同时关闭远程终端及远程执行能力 |
| `--disable-auto-update` | 禁用 Agent 自动更新 | Docker 部署应通过更新镜像升级 |
| `--ignore-unsafe-cert` | 忽略证书错误 | 仅用于受控测试环境，生产环境不建议使用 |
| `--memory-include-cache` | 调整内存统计口径 | 将缓存和缓冲区计入内存使用量 |
| `--get-ip-addr-from-nic` | 从网卡获取 IP | 适合出口地址无法代表节点地址的环境 |
| `--gpu` | 启用详细 GPU 监控 | 需要系统提供受支持的 GPU 工具或接口 |
| `--include-nics` | 只统计指定网卡 | 多个网卡名称使用逗号分隔 |
| `--exclude-nics` | 排除指定网卡 | 多个网卡名称使用逗号分隔 |
| `--include-mountpoint` | 只统计指定挂载点 | 多个挂载点使用分号分隔 |
| `-i`, `--interval` | 数据采集间隔 | 单位为秒；后台命令生成器最低按 1 秒处理 |
| `--month-rotate` | Agent 本地流量月度重置日 | `1` 至 `31`；不启用时为 `0` |

以下参数只作用于安装脚本，不会传给 Docker 容器中的 Agent：

| 参数 | 作用 |
| --- | --- |
| `--install-ghproxy` | 为安装脚本指定 GitHub 下载代理 |
| `--install-dir` | 指定 Agent 安装目录 |
| `--install-service-name` | 指定系统服务名称 |

其他参数、环境变量和 JSON 配置方式见 [Agent 接入](/remote/agent)，最终以 `nuomiiiii/komari-agent` 的 `--help` 输出为准。

## Cloudflare Access

如果面板受到 Cloudflare Access Service Token 保护，自动发现请求与后续 Agent 连接都需要同时提供 Client ID 和 Client Secret：

```bash
--cf-access-client-id 'CLIENT_ID' \
--cf-access-client-secret 'CLIENT_SECRET'
```

两个参数必须成对配置。不要把 Service Token 和自动发现密钥写入公开仓库。

## 批量部署

同一个自动发现密钥可以用于接入多台服务器，每台服务器会获得不同的节点凭据。可通过 SSH、Ansible 或云主机初始化脚本分发后台生成的命令。

批量部署时请遵守以下原则：

- 把面板地址和自动发现密钥存放在部署系统的加密变量中。
- 不要把真实密钥直接提交到脚本仓库。
- 确认每台服务器的主机名可区分；自动创建的名称可在后台再次修改。
- 确保每台服务器都能访问 Komari Lite 的 HTTPS 地址。
- 每台 Agent 使用独立安装目录；每个 Docker 实例使用独立凭据文件。
- 建议先在一台服务器验证命令和参数，再扩大部署范围。

## 密钥轮换与节点重装

- 修改或清空自动发现密钥只影响后续注册，不会让已经注册的 Agent 离线。
- 怀疑密钥泄露时，应立即生成新密钥并保存；尚未注册的服务器改用新命令。
- `auto-discovery.json` 包含节点凭据，应与 Agent Token 同等保护。
- 普通升级或重启不要删除该文件，否则 Agent 会再次注册并产生重复节点。
- 如果后台已经删除原节点，需要重新接入：先停止 Agent，删除本机的 `auto-discovery.json`，再使用当前自动发现密钥启动；随后清理后台残留的旧节点记录。

## 故障排除

### 返回 403 或提示密钥无效

- 确认“系统设置 > 通用”中已保存自动发现密钥。
- 确认密钥不少于 12 个字符，并且命令没有遗漏或多出空格。
- 密钥轮换后，尚未注册的服务器必须使用新命令。
- 如果使用反向代理或安全网关，确认它没有移除 Agent 请求的认证信息。

### Docker 重启后出现重复节点

检查 `/app/auto-discovery.json` 是否正确绑定到宿主机文件，并确认该文件在容器重建后仍然存在。不要只挂载临时容器层，也不要让多个容器共享同一文件。

### 注册成功但节点没有上线

- 检查面板地址是否可以从 Agent 所在服务器访问。
- 检查 HTTPS 证书、DNS、反向代理和 WebSocket 转发。
- 查看 Agent 服务日志，确认没有凭据、证书或连接错误。

Linux systemd 安装可查看：

```bash
sudo journalctl -u komari-agent -f
```

如果使用了自定义服务名，请把 `komari-agent` 替换为实际名称。

更多状态、Docker 日志、重启、更新和卸载命令见 [Agent 安装与维护](/install/agent)。
