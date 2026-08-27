# Agent RFC

本页描述 Lite 服务端与 `nuomiiiii/Lite-agent` 当前实际使用的线协议，供第三方 Agent、采集器和兼容客户端开发。它不是对上游未来协议的承诺。

::: info Agent 口径
本文以 Lite-agent `2.3.0.0` 为实现基线。Lite 继续保留上游兼容端点、消息和 `X-Komari-*` 请求头；这些名称属于线协议兼容层，不代表 Agent 仍从旧仓库发布或更新。
:::

::: danger 安全边界
Agent Token 等同于节点身份。不要写入日志、URL 分享、前端代码或公开配置。生产环境使用 HTTPS/WSS；只有隔离测试环境才可忽略证书校验。
:::

## 协议概览

| 能力 | v1 | v2 |
| --- | --- | --- |
| 实时 report | 原始 JSON WebSocket/POST | JSON-RPC 2.0 WebSocket/POST |
| 基础信息 | 独立 HTTP POST | `agent.basicInfo` |
| 下发任务 | WebSocket 兼容消息 | JSON-RPC 事件 |
| WebSocket 不可用 | 只能使用分散 HTTP 接口 | POST report + `agent.pull` 长轮询 |
| 压缩 | 无协议级要求 | gzip POST、permessage-deflate WebSocket |
| 回程路由 | 不支持 | `agent.route` / `agent.routeResult` |
| 推荐用途 | 旧 Agent 兼容 | 新 Agent 默认协议 |

Lite 当前配套 Agent 默认 `--protocol-version=2`，与上游官方 Agent 一致。连续 3 次确认属于 v2 协议或 HTTP 状态错误后，会在当前连接周期回退到 v1。

## 认证与端点

推荐请求头：

```http
Authorization: Bearer <client-token>
```

兼容查询参数：`?token=<client-token>`。新 Agent 不应使用查询参数传递 Token。

主要端点：

| 端点 | 方法 | 说明 |
| --- | --- | --- |
| `/api/clients/v2/rpc` | WebSocket GET | v2 双向主通道 |
| `/api/clients/v2/rpc` | POST | v2 上报与 fallback 长轮询 |
| `/api/clients/report` | WebSocket GET | v1 实时上报与事件 |
| `/api/clients/report` | POST | v1 report fallback |
| `/api/clients/uploadBasicInfo` | POST | v1 基础信息 |
| `/api/clients/task/result` | POST | 远程执行结果，v1/v2 Agent 共用 |
| `/api/clients/ping/tasks` | GET | v1 拉取 Ping 任务 |
| `/api/clients/ping/result` | POST | v1 上传 Ping 结果 |
| `/api/clients/terminal` | WebSocket GET | 独立旧终端数据通道 |
| `/api/clients/remote` | WebSocket GET | 远程终端与文件会话通道 |

Lite 配套 Agent 与上游官方 Agent 一样，还可同时发送 Cloudflare Access Service Token：

```http
CF-Access-Client-Id: <id>
CF-Access-Client-Secret: <secret>
```

这两项只负责通过 Cloudflare Access，不代替 Komari Agent Token。

## v2 JSON-RPC

请求包：

```json
{
  "jsonrpc": "2.0",
  "method": "agent.report",
  "params": {},
  "id": "report-1"
}
```

- `jsonrpc` 必须为 `2.0`。
- `method` 区分大小写。
- 需要读取响应和 fallback 事件时，`id` 必须非空。
- WebSocket notification 可省略 `id`；服务端不会为其写响应。
- POST 请求即使只做上报，也建议带 `id` 并校验 JSON-RPC error。

v2 POST 支持：

```http
Content-Type: application/json
Content-Encoding: gzip
```

`Content-Encoding: gzip` 是可选项。设置该头时 body 必须是完整 gzip 数据，不可只压缩 `params`。

## 连接状态机

Lite 配套 Agent 与上游官方 Agent 一致的实际连接流程：

1. 启动后先上传基础信息。
2. 连接 `/api/clients/v2/rpc` WebSocket。
3. 连接成功后每 3 秒发送一次 report，另每 30 秒发送 WebSocket Ping 控制帧。
4. 连接失败时按 `max_retries` 和 `reconnect_interval` 重试。
5. v2 WebSocket 多次失败后进入 POST fallback。
6. fallback 同时运行 report POST 和 `agent.pull` 长轮询，并按重连间隔恢复 WebSocket。
7. 检测到服务端不支持 v2 时回退 v1；连接周期结束后会再次探测 v2。

服务端 WebSocket 读取超时约 11 秒。自定义 Agent 应确保 report 或其他消息间隔小于该值；推荐 3-5 秒，不要把 `interval` 调到 11 秒以上后仍期望长连接稳定。

POST report 或 `agent.pull` 会刷新节点 fallback 在线状态；约 35 秒没有新请求后，该状态过期。

## Agent → Server 方法

当前服务端 v2 实际接收的方法：

| 方法 | 用途 | WebSocket | POST |
| --- | --- | --- | --- |
| `agent.report` | 实时指标上报 | 支持 | 支持 |
| `agent.basicInfo` | 静态基础信息 | 支持 | 支持，Lite 配套 Agent 与上游官方 Agent 均使用 |
| `agent.pingResult` | Ping 结果 | 支持 | 支持 |
| `agent.routeResult` | 回程路由结果 | 支持 | 支持 |
| `agent.pull` | 拉取待下发事件 | 立即返回 | 最长等待约 25 秒 |

`agent.taskResult` 虽然在共享常量中保留，但当前 v2 分发器没有接收实现。命令结果必须调用 `/api/clients/task/result`。`agent.event` 也不是当前 Agent 上行入口。

### `agent.report`

```json
{
  "jsonrpc": "2.0",
  "method": "agent.report",
  "params": {
    "report": {
      "cpu": { "usage": 12.5 },
      "ram": { "total": 1073741824, "used": 536870912 },
      "swap": { "total": 0, "used": 0 },
      "load": { "load1": 0.1, "load5": 0.08, "load15": 0.05 },
      "disk": { "total": 21474836480, "used": 8589934592 },
      "network": {
        "up": 1024,
        "down": 2048,
        "totalUp": 1073741824,
        "totalDown": 2147483648
      },
      "connections": { "tcp": 20, "udp": 3 },
      "uptime": 86400,
      "process": 96,
      "message": ""
    },
    "ack_event_ids": ["event-id-1"]
  },
  "id": "report-1"
}
```

成功响应可顺带返回最多 8 个待处理事件：

```json
{
  "jsonrpc": "2.0",
  "id": "report-1",
  "result": {
    "status": "success",
    "events": []
  }
}
```

### 实时上报字段

| 字段 | 类型 | 单位/说明 |
| --- | --- | --- |
| `cpu.usage` | number | 百分比，`0..100` |
| `ram.total` | integer | 字节 |
| `ram.used` | integer | 字节 |
| `swap.total` | integer | 字节 |
| `swap.used` | integer | 字节 |
| `load.load1` | number | 1 分钟负载，服务端接受 `0..1000` |
| `load.load5` | number | 5 分钟负载 |
| `load.load15` | number | 15 分钟负载 |
| `disk.total` | integer | 字节 |
| `disk.used` | integer | 字节 |
| `network.up` | integer | 字节/秒 |
| `network.down` | integer | 字节/秒 |
| `network.totalUp` | integer | Agent 当前周期累计上传字节 |
| `network.totalDown` | integer | Agent 当前周期累计下载字节 |
| `connections.tcp` | integer | TCP 连接数 |
| `connections.udp` | integer | UDP 连接数 |
| `uptime` | integer | 秒 |
| `process` | integer | 进程数 |
| `message` | string | 可公开展示的状态信息，不得含敏感数据 |
| `gpu` | object | 可选 GPU 明细 |

服务端拒绝负容量、负网络计数、负进程/连接数以及超出范围的 CPU/Load1。`uuid` 和 `updated_at` 由服务端覆盖，Agent 不应依赖自行上传的值。

GPU 明细：

```json
{
  "gpu": {
    "count": 2,
    "average_usage": 31.5,
    "detailed_info": [
      {
        "name": "NVIDIA GPU",
        "memory_total": 25769803776,
        "memory_used": 4294967296,
        "utilization": 35.0,
        "temperature": 52
      }
    ]
  }
}
```

### `agent.basicInfo`

```json
{
  "jsonrpc": "2.0",
  "method": "agent.basicInfo",
  "params": {
    "info": {
      "cpu_name": "AMD EPYC",
      "cpu_cores": 4,
      "cpu_physical_cores": 2,
      "arch": "amd64",
      "os": "Debian GNU/Linux 12",
      "kernel_version": "6.1.0",
      "ipv4": "203.0.113.10",
      "ipv6": "2001:db8::10",
      "mem_total": 4294967296,
      "swap_total": 1073741824,
      "disk_total": 53687091200,
      "gpu_name": "None",
      "virtualization": "kvm",
      "version": "1.0.0",
      "remote_control_protected": false
    }
  },
  "id": "basic-1"
}
```

| 字段 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| `cpu_name` | string | 建议 | CPU 型号 |
| `cpu_cores` | integer | 建议 | 逻辑核心数 |
| `cpu_physical_cores` | integer | 否 | 物理核心数，未知填 `0` |
| `arch` | string | 建议 | 架构 |
| `os` | string | 建议 | 操作系统 |
| `kernel_version` | string | 否 | 内核版本 |
| `ipv4` | string | 否 | 公网 IPv4 |
| `ipv6` | string | 否 | 公网 IPv6 |
| `mem_total` | integer | 建议 | 字节 |
| `swap_total` | integer | 建议 | 字节 |
| `disk_total` | integer | 建议 | 字节 |
| `gpu_name` | string | 否 | GPU 摘要 |
| `virtualization` | string | 否 | 虚拟化类型 |
| `version` | string | 建议 | Agent 版本，服务端不解析格式 |
| `remote_control_protected` | boolean | 否 | 是否因安全策略阻止远程控制 |
| `month_rotate` | integer | 握手时 | `0` 禁用，`1..31` 为流量重置日 |

服务端启用 GeoIP 时，会根据上报 IP 补充地区。v2 基础信息没有可靠的连接 IP 兜底，自定义 Agent 如需地区识别应正确上报至少一个 IP。

响应包含两种配置握手：

```json
{
  "status": "success",
  "config": { "month_rotate": 1 }
}
```

或：

```json
{
  "status": "success",
  "request_config_state": true
}
```

收到 `request_config_state=true` 时，Lite 配套 Agent 会与上游官方 Agent 一样再次上传当前 `month_rotate`。服务端设置优先时，Agent 应应用 `config.month_rotate`。

### `agent.pingResult`

```json
{
  "jsonrpc": "2.0",
  "method": "agent.pingResult",
  "params": {
    "task_id": 12,
    "ping_type": "tcp",
    "value": 28,
    "finished_at": "2026-08-04T08:00:00Z"
  },
  "id": "ping-result-1"
}
```

`value` 单位为毫秒，`-1` 表示失败/丢包。当前服务端按接收时间入库，`ping_type` 和 `finished_at` 用于协议可读性，但不决定记录主键或时间。

### `agent.routeResult`

```json
{
  "jsonrpc": "2.0",
  "method": "agent.routeResult",
  "params": {
    "task_id": 8,
    "protocol": "icmp",
    "target": "example.com",
    "ip_version": 4,
    "hops": [
      { "ttl": 1, "ip": "192.0.2.1", "latency_ms": 1.25 },
      { "ttl": 2, "timeout": true }
    ],
    "error": "",
    "finished_at": "2026-08-04T08:00:00Z"
  },
  "id": "route-result-1"
}
```

`finished_at` 必须是带时区时间。Lite 当前配套 Agent 与上游官方 Agent 的内置回程探测都实际执行 ICMP traceroute；`protocol` 字段会原样回传，但不要据此假定已支持 TCP/UDP traceroute。

### `agent.pull`

```json
{
  "jsonrpc": "2.0",
  "method": "agent.pull",
  "params": {
    "capabilities": ["exec", "ping", "route", "remote", "config"],
    "ack_event_ids": ["event-id-1"],
    "last_event_id": ""
  },
  "id": "pull-1"
}
```

POST 时服务端最多等待约 25 秒，有事件立即返回，无事件返回 `events: []`。当前实现使用 `ack_event_ids`；`capabilities` 和 `last_event_id` 已保留但暂不参与服务端筛选。

每个 Agent 只应保留一个活跃 pull，收到响应后立即发起下一次。report 与 pull 可并行。

## Server → Agent 事件

WebSocket 事件：

```json
{
  "jsonrpc": "2.0",
  "method": "agent.exec",
  "params": {
    "task_id": "task-id",
    "command": "uname -a"
  }
}
```

POST fallback 返回的事件多一层队列元数据：

```json
{
  "id": "event-id-1",
  "method": "agent.exec",
  "params": {},
  "created_at": "2026-08-04T08:00:00Z",
  "expires_at": "2026-08-04T08:05:00Z"
}
```

当前事件队列每个节点最多 128 条：普通事件保留 5 分钟，Ping 约 3 秒，回程路由约 2 分钟。Ping/路由同任务的新事件会合并旧事件。

fallback 采用至少一次投递语义。Agent 必须按事件 `id` 去重，处理成功后通过 `ack_event_ids` 确认。重复执行远程命令会产生实际副作用，因此幂等和 512 条左右的近期去重缓存是必要的。

### 远程执行

`agent.exec`：

```json
{
  "task_id": "task-id",
  "command": "echo ok"
}
```

执行前必须检查本地远程控制开关和安全策略。Lite 配套 Agent 在 Windows 使用 PowerShell，在 Unix 使用 `sh -s`。

结果不走 v2 method，而是：

`POST /api/clients/task/result`

```json
{
  "task_id": "task-id",
  "result": "ok\n",
  "exit_code": 0,
  "finished_at": "2026-08-04T08:00:00Z"
}
```

当前服务端使用接收时间作为完成时间，额外的 `finished_at` 会被兼容忽略。

### Ping 任务

`agent.ping`：

```json
{
  "ping_task_id": 12,
  "ping_type": "icmp",
  "ping_target": "1.1.1.1"
}
```

支持 `icmp`、`tcp`、`http`。TCP 未指定端口时默认 80；HTTP 未指定 scheme 时默认 `http://`。失败统一上报 `-1`。

### 回程路由

`agent.route`：

```json
{
  "task_id": 8,
  "protocol": "icmp",
  "target": "example.com",
  "ip_version": 4,
  "max_hops": 30
}
```

`ip_version` 支持 4 或 6；无效值按 4 处理。`max_hops` 有效范围为 `1..64`，否则按 30。原始 ICMP 探测通常需要 root 或 `CAP_NET_RAW`。

### 运行时配置

`agent.config`：

```json
{
  "month_rotate": 1
}
```

允许 `0..31`。应用失败时不要确认事件，让服务端可再次投递。

### 远程终端与文件

新远程会话使用 `agent.remote.request`：

```json
{
  "request_id": "session-id",
  "ticket": "one-time-agent-ticket"
}
```

Agent 随后连接 `/api/clients/remote`，请求头必须包含：

```http
X-Komari-Remote-Session: <session-id>
X-Komari-Remote-Ticket: <ticket>
```

该独立 WebSocket 承载终端和文件协议，主 RPC 通道只负责发起会话。Ticket 是一次性授权，不得复用。

旧终端当前仍可能收到兼容消息：

```json
{
  "message": "terminal",
  "request_id": "session-id"
}
```

Agent 随后连接 `/api/clients/terminal`，并发送：

```http
X-Komari-Terminal-Session: <session-id>
```

上游旧文档中的 `?id=` 不符合 Lite 当前服务端实现。第三方 Agent 应使用请求头。

### 消息事件

Lite 配套 Agent 与上游官方 Agent 都能解析 `agent.message` 和 `agent.event` 并记录日志，但当前 Lite 服务端没有把它们作为通用外部消息总线。不要依赖它们承载必须送达的业务任务。

## v1 兼容协议

### 基础信息

`POST /api/clients/uploadBasicInfo`

body 直接使用基础信息对象，不包 `info`。响应可能包含 `config` 或 `request_config_state`。

### 实时 report

- WebSocket：`GET /api/clients/report`
- POST：`POST /api/clients/report`

body 直接使用 report 对象，不包 JSON-RPC envelope。

### v1 事件

远程执行：

```json
{
  "message": "exec",
  "task_id": "task-id",
  "command": "echo ok"
}
```

Ping：

```json
{
  "message": "ping",
  "ping_task_id": 12,
  "ping_type": "tcp",
  "ping_target": "example.com:443"
}
```

### v1 Ping 轮询

- `GET /api/clients/ping/tasks` 获取分配给当前节点的任务。
- `POST /api/clients/ping/result` 上传 `task_id`、`value`、`ping_type`。

v1 没有回程路由协议，也没有与 v2 相同的可靠 fallback 事件队列。

## Lite-agent 参数

| 参数 | 环境变量 | 默认 | 说明 |
| --- | --- | --- | --- |
| `--endpoint` | `AGENT_ENDPOINT` | 空 | 面板地址 |
| `--token` | `AGENT_TOKEN` | 空 | Agent Token |
| `--interval` | `AGENT_INTERVAL` | `3` 秒 | report 间隔 |
| `--info-report-interval` | `AGENT_INFO_REPORT_INTERVAL` | `5` 分钟 | 基础信息间隔 |
| `--max-retries` | `AGENT_MAX_RETRIES` | `3` | 连接重试次数 |
| `--reconnect-interval` | `AGENT_RECONNECT_INTERVAL` | `5` 秒 | 重连间隔 |
| `--protocol-version` | `AGENT_PROTOCOL_VERSION` | `2` | `1` 或 `2` |
| `--disable-compression` | `AGENT_DISABLE_COMPRESSION` | `false` | 关闭 v2 gzip 和 WS 压缩 |
| `--disable-web-ssh` | `AGENT_DISABLE_WEB_SSH` | `false` | 禁止远程终端、文件和命令 |
| `--ignore-unsafe-cert` | `AGENT_IGNORE_UNSAFE_CERT` | `false` | 忽略证书错误 |
| `--prefer-ip-version` | `AGENT_PREFER_IP_VERSION` | 空 | 面板连接优先 4 或 6 |
| `--month-rotate` | `AGENT_MONTH_ROTATE` | `0` | 流量重置日 |
| `--gpu` | `AGENT_ENABLE_GPU` | `false` | 详细 GPU 上报 |

命令行、环境变量和 JSON 配置文件均可设置。优先级从低到高为：默认值、JSON 配置文件、环境变量、明确传入的命令行参数。没有显式传入的命令行参数不会用默认值覆盖其他配置来源；部署工具仍应避免在多个来源重复设置同一字段。

## 实现检查清单

1. 使用 Bearer Token，并同时支持 HTTPS/WSS。
2. v2 请求严格使用 JSON-RPC `2.0`。
3. report 间隔保持在服务端读取超时以内。
4. fallback 同时运行 report 和单一 pull 长轮询。
5. 按事件 ID 去重，成功后再 ack。
6. 命令、终端和文件访问受本地禁用开关保护。
7. 所有容量、累计流量和速率使用非负 64 位整数。
8. Ping 失败上报 `-1`，不要丢弃失败样本。
9. 远程执行结果继续走独立 HTTP 端点。
10. 未识别方法记录日志后忽略，不能导致主连接退出。
