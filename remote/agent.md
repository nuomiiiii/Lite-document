# Agent 接入

Agent 负责采集服务器状态、执行探测并在管理员授权后提供远程能力。

::: info Agent 口径
本页使用的是 Lite 配套的 `nuomiiiii/komari-agent`。它与上游官方 Agent 的当前协议、默认参数和远程能力一致，并已与 Lite 服务端实际实现核对；仓库、二进制下载和更新源仍使用 `nuomiiiii` 分支。协议细节见 [Agent RFC](/development/agent-rfc)。
:::

需要批量接入服务器时，请使用 [Agent 自动发现](/install/agent-ad)。自动发现会为每台 Agent 单独签发并保存节点凭据，不需要逐台创建节点和复制 Token。

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

## 流量重置日

新版面板会把服务器编辑页中的流量重置日同步给在线 Agent。离线 Agent 恢复连接后再应用变更，不会删除本地 `net_static.json` 中已经采集的流量。

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
