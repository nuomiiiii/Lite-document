# Agent 接入与配置

Agent 负责采集服务器状态、执行探测并在管理员授权后提供远程能力。

::: info Agent 口径
本页使用的是 Lite 配套的 `nuomiiiii/komari-agent`。它与上游官方 Agent 的当前协议、默认参数和远程能力一致，并已与 Lite 服务端实际实现核对；仓库、二进制下载和更新源仍使用 `nuomiiiii` 分支。协议细节见 [Agent RFC](/development/agent-rfc)。
:::

需要批量接入服务器时，请使用 [Agent 自动发现](/install/agent-ad)。自动发现会为每台 Agent 单独签发并保存节点凭据，不需要逐台创建节点和复制 Token。

安装、服务状态、日志、更新、重启和卸载命令统一见 [Agent 安装与维护](/install/agent)。

Komari `2.2.3` 第四次更新建议搭配 Agent `2.2.0.2`。除完整配置上报、在线下发和结果确认外，这组版本还修复了 Agent 进程运行但面板误判离线的问题，并能在 WebSocket 中断后自动恢复连接。

## 最小配置

```bash
./komari-agent \
  --endpoint "https://example.com" \
  --token "你的-Agent-Token"
```

也可以使用环境变量：

```bash
export AGENT_ENDPOINT="https://example.com"
export AGENT_TOKEN="你的-Agent-Token"
./komari-agent
```

## JSON 配置

```json
{
  "endpoint": "https://example.com",
  "token": "your-token",
  "interval": 3,
  "disable_auto_update": false,
  "disable_web_ssh": false,
  "ignore_unsafe_cert": false
}
```

```bash
./komari-agent --config ./config.json
```

完整参数以 [Agent 仓库](https://github.com/nuomiiiii/komari-agent) 和 `./komari-agent --help` 为准。

## 常用参数

| 参数 | 用途 |
| --- | --- |
| `--interval` | 服务器状态采集间隔，单位秒 |
| `--include-nics` / `--exclude-nics` | 限定参与流量统计的网卡 |
| `--include-mountpoint` | 限定参与统计的挂载点 |
| `--disable-web-ssh` | 禁用远程终端与相关远程控制 |
| `--prefer-ip-version` | 优先使用 IPv4 或 IPv6 |
| `--custom-dns` | 指定 Agent 使用的 DNS |
| `--ignore-unsafe-cert` | 忽略证书错误，仅用于受控测试环境 |

## 配置保存与在线下发

服务器列表中的 Agent 部署配置按节点保存在 Komari 服务端，不依赖当前浏览器。可在线修改的运行配置包括采集间隔、流量重置日、包含或排除网卡、包含挂载点、内存缓存计入方式和 GPU 监控。

操作流程如下：

1. “保存配置”只把内容保存到 Komari，状态为“已保存”。
2. “保存并下发”会保存最新内容并发送给在线 Agent，状态变为“已发送”。
3. Agent 应用成功并回传确认后，状态变为“已生效”。
4. Agent 拒绝或应用失败时显示“应用失败”，界面会保留原因供排查。

离线节点只保留最后一次等待下发的配置。恢复连接后不会重复应用此前已经被覆盖的版本。

### 不能在线下发的选项

禁用远程控制、忽略不安全证书、禁用自动更新、从网卡获取 IP 地址、GitHub 代理、安装目录和服务名只会保存到安装配置，用于下次生成重装指令。它们不会进入在线下发内容，必须手动重新安装 Agent 才能改变。

Agent 会上报当前生效配置。Komari 仅使用上报内容初始化尚未保存过配置的节点，不会用旧 Agent 状态覆盖管理员已保存的内容。

## 流量重置日

面板中的“流量重置日”同时用于服务器账单统计和 Agent 本地流量周期。通过“保存并下发”发送给在线 Agent 后，Agent 会确认是否已应用；离线 Agent 恢复连接后再应用最新变更，不会删除本地 `net_static.json` 中已经采集的流量。

## Cloudflare Access

Agent 支持 Service Token：

```bash
./komari-agent \
  --endpoint "https://example.com" \
  --token "你的-Agent-Token" \
  --cf-access-client-id "client-id" \
  --cf-access-client-secret "client-secret"
```

这两个值必须成对配置。不要把它们放进公开仓库或可被普通用户读取的进程日志。

## 凭据失败

日志中的 Agent `403` 通常表示 UUID/Token 不匹配、旧 Agent 仍在使用已轮换 Token，或代理没有把请求送到正确实例。更换 HTTPS 证书本身不会改变 Agent Token。

遇到证书、DNS、连接超时、反复重启或进程运行但节点离线时，按 [Agent 日志排查](/install/agent#根据日志排查) 的顺序检查。
