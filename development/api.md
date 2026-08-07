# API 与 RPC2

Komari Lite 同时保留兼容 HTTP API，并提供 JSON-RPC 2.0 入口。新主题和新集成优先使用 RPC2；旧 HTTP 路由主要用于兼容现有主题、脚本和 Agent。

::: warning 版本口径
本页只记录 `nuomiiiii/komari` 当前实际提供的接口。标为兼容的旧 HTTP 接口与上游对应接口保持相同调用方式；Lite 新增字段、RPC2 方法或明确差异会直接注明。未收录的上游接口不代表 Lite 支持，不要根据数据库表、后台页面请求或上游插件接口推断兼容范围。
:::

## 基础约定

- URL 示例中的 `https://monitor.example.com` 替换为实际面板地址。
- 容量和流量单位均为字节；网络速率为字节/秒。
- 时间使用带时区的 RFC3339，服务端通常返回 UTC。
- 未登录访问会过滤 `hidden=true` 的节点。
- 私有站点启用后，除登录页所需接口外，匿名请求会被拒绝。
- 主题应只调用公共接口，不应读取 SQLite、指标数据库或服务端数据目录。

## 认证

| 调用者 | 认证方式 | 适用范围 |
| --- | --- | --- |
| 匿名访客 | 无 | 公开 HTTP API、`public:*`、`common:*` |
| 管理员会话 | `session_token` Cookie | `/api/admin/*`、`admin:*` |
| API Key | `Authorization: Bearer <api-key>` | 管理接口和 `admin:*` |
| Agent | `Authorization: Bearer <client-token>` | `/api/clients/*`、`client:*`、Agent RFC |

Agent Token 也兼容 `?token=`、`?Authorization=` 和部分 JSON body 中的 `token`，但 URL 中的 Token 可能进入代理日志、浏览器历史和监控记录。新接入应使用 `Authorization` 请求头。

身份识别优先级为 API Key、管理员会话、Agent Token、匿名访客。API Key 与 Agent Token 都使用 Bearer 形式，服务端会先判断它是否为面板 API Key。

### 敏感操作与 2FA

远程执行、Token 轮换、终端等敏感操作可能要求二次验证。支持：

- `X-2FA-Code: 123456`
- `X-Two-Factor-Code: 123456`
- RPC `params` 中的 `2fa_code`、`two_factor_code` 或 `otp`

API Key 调用不再重复要求 2FA。不要把管理员 Cookie、API Key 或 2FA 验证码放进公开主题配置。

## HTTP 响应

大部分兼容 HTTP API 使用统一外层：

```json
{
  "status": "success",
  "message": "",
  "data": {}
}
```

失败通常为：

```json
{
  "status": "error",
  "message": "错误说明"
}
```

少数兼容接口直接返回数据，例如 `/api/me`、部分 Agent 路由和后台原始接口。调用方应同时检查 HTTP 状态码和响应体，不要只判断 `status`。

## 公开 HTTP API

### 当前用户

`GET /api/me`

未登录：

```json
{
  "username": "Guest",
  "logged_in": false
}
```

已登录时还会返回：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `username` | string | 管理员名称 |
| `logged_in` | boolean | 是否已登录 |
| `uuid` | string | 用户 UUID |
| `sso_type` | string | SSO 类型 |
| `sso_id` | string | SSO 用户标识 |
| `2fa_enabled` | boolean | 是否启用 2FA |

### 公开站点设置

`GET /api/public`

常用 `data` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sitename` | string | 站点名称 |
| `description` | string | 站点描述 |
| `custom_head` | string | 管理员自定义 head 片段 |
| `custom_body` | string | 管理员自定义 body 末尾片段 |
| `oauth_enable` | boolean | 是否启用 OAuth |
| `oauth_provider` | string | OAuth 提供商 |
| `disable_password_login` | boolean | 是否禁用密码登录 |
| `cors_origin_check_enabled` | boolean | 是否启用来源校验 |
| `private_site` | boolean | 是否为私有站点 |
| `visitor_audit_enabled` | boolean | 是否启用访客审计 |
| `record_enabled` | boolean | 是否存在启用保留期的指标 |
| `record_preserve_time` | number | 当前最大指标保留时长，小时 |
| `ping_record_preserve_time` | number | 兼容字段，小时 |
| `theme` | string | 当前主题 `short` |
| `theme_settings` | object | 当前主题公开配置及默认值 |

`theme_settings` 对所有访客公开。主题作者不得把 Token、密钥、私密 URL 或内部账号放进动态主题配置。

持有有效临时分享 Cookie 时，`private_site` 会临时返回 `false`，便于主题按可访问状态渲染。

### 服务端版本

`GET /api/version`

```json
{
  "status": "success",
  "message": "",
  "data": {
    "version": "2.2.1",
    "hash": "build-commit-hash",
    "deployment": "docker"
  }
}
```

`deployment` 是 Lite 扩展字段，表示当前部署类型；调用方应允许未知值。

### 节点基本信息

`GET /api/nodes`

返回可见节点数组。匿名访问会过滤隐藏节点，并固定清空 `token`、Agent `version`、私有 `remark`、`ipv4`、`ipv6`。

稳定展示字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `uuid` | string | 节点 UUID |
| `name` | string | 节点名称 |
| `cpu_name` | string | CPU 型号 |
| `cpu_cores` | number | 逻辑核心数 |
| `cpu_physical_cores` | number | 物理核心数，`0` 表示未知 |
| `arch` | string | 架构 |
| `os` | string | 操作系统 |
| `kernel_version` | string | 内核版本 |
| `virtualization` | string | 虚拟化类型 |
| `gpu_name` | string | GPU 摘要 |
| `mem_total` | number | 总内存 |
| `swap_total` | number | 总 Swap |
| `disk_total` | number | 总磁盘 |
| `region` | string | 地区展示值 |
| `region_override` | string | 手动地区代码，未设置时为空 |
| `public_remark` | string | 公开备注 |
| `group` | string | 分组 |
| `tags` | string | 以分号分隔的标签 |
| `weight` | number | 排序权重 |
| `hidden` | boolean | 是否对访客隐藏 |
| `price` | number | 价格；`-1` 常表示免费 |
| `currency` | string | 货币符号 |
| `billing_cycle` | number | 计费周期，天 |
| `auto_renewal` | boolean | 是否自动续费 |
| `expired_at` | string \| null | 到期时间 |
| `traffic_limit` | number | 配置流量额度 |
| `traffic_limit_type` | string | `max`、`min`、`sum`、`up`、`down` |
| `effective_traffic_limit` | number | 当前周期生效额度 |
| `effective_traffic_type` | string | 当前周期生效统计方式 |
| `traffic_reset_day` | number | 服务端流量重置日，缺失表示跟随 Agent |
| `remote_control_protected` | boolean | Agent 是否因安全策略阻止远程控制 |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

主题应优先使用 `effective_traffic_limit` 和 `effective_traffic_type` 展示当前周期额度，不要自行重复叠加校准值。

### 最近一分钟状态

`GET /api/recent/{uuid}`

返回最近一分钟内的实时上报数组。结构与 Agent report 相同：

```json
{
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
  "message": "",
  "updated_at": "2026-08-04T08:00:00Z"
}
```

`gpu` 为可选对象，详细结构见 [Agent RFC](/development/agent-rfc#实时上报字段)。流量累计值已经过当前周期校准，主题不要再次修正。

### 旧版负载历史

`GET /api/records/load?uuid={uuid}&hours=4&load_type=all`

`uuid` 必填。`load_type` 支持：`cpu`、`gpu`、`ram`、`swap`、`load`、`temp`、`disk`、`network`、`process`、`connections`、`all`。

返回扁平化兼容记录，例如 `cpu`、`ram`、`ram_total`、`net_in`、`net_out`、`net_total_up`、`net_total_down`。这与实时接口的嵌套结构不同。

::: tip 新开发建议
48 小时、多节点或多指标查询优先使用 `public:queryMetrics`。它默认服务端降采样到约 500 点，避免旧接口重复解码并返回大量兼容记录。
:::

### 旧版 Ping 历史

`GET /api/records/ping?uuid={uuid}&task_id={id}&hours=4`

`uuid` 和 `task_id` 至少提供一个。返回：

- `records[]`：`task_id`、`time`、`value`、`client`；`value=-1` 表示丢包。
- `basic_info[]`：按节点聚合的 `loss`、`min`、`max`。
- `tasks[]`：相关任务及 `avg`、`total` 等统计。

该接口不会主动限制返回点数。较长时间范围应使用 `public:getPingMetricStats` 或 `public:queryMetrics`。

### 公开 Ping 任务

`GET /api/task/ping`

字段包括 `id`、`name`、`clients`、`default_on`、`type`、`interval`、`weight`。

### 实时状态 WebSocket

`GET /api/clients` 升级为 WebSocket。连接后发送：

- `get`：获取全部可见节点。
- `get <uuid>`：只获取一个节点。

```js
const socket = new WebSocket("wss://monitor.example.com/api/clients");
socket.addEventListener("open", () => socket.send("get"));
socket.addEventListener("message", (event) => {
  const payload = JSON.parse(event.data);
  console.log(payload.data.online, payload.data.data);
});
```

`data.online` 为在线 UUID 数组，`data.data` 为以 UUID 为键的最新 report。断线后应指数退避重连，并在重连后重新发送订阅命令。

## JSON-RPC 2.0

入口：

- `POST /api/rpc2`：单条或批量请求。
- `GET /api/rpc2`：升级为 WebSocket 后逐条收发。

推荐始终提供非空 `id`：

```json
{
  "jsonrpc": "2.0",
  "method": "public:getVersion",
  "params": {},
  "id": "version-1"
}
```

成功：

```json
{
  "jsonrpc": "2.0",
  "id": "version-1",
  "result": {
    "version": "2.2.1",
    "hash": "build-commit-hash",
    "deployment": "docker"
  }
}
```

失败：

```json
{
  "jsonrpc": "2.0",
  "id": "version-1",
  "error": {
    "code": -32602,
    "message": "Invalid params"
  }
}
```

### 错误码

| 错误码 | 说明 |
| --- | --- |
| `-32700` | JSON 解析错误 |
| `-32600` | 请求结构或版本错误 |
| `-32601` | 方法不存在 |
| `-32602` | 参数错误 |
| `-32603` | 内部错误 |
| `-32040` | 未认证 |
| `-32041` | 权限不足 |
| `-32044` | 资源不存在 |
| `-32050` | 未实现 |
| `-32051` | 暂不可用 |

### 命名空间

| 命名空间 | 权限 | 用途 |
| --- | --- | --- |
| `public:*` | 访客 | 站点、历史、指标和访客事件 |
| `common:*` | 访客 | 主题常用节点与记录接口 |
| `client:*` | Agent | Ping 任务、Ping 结果、命令结果 |
| `admin:*` | 管理员/API Key | 后台管理与敏感操作 |

稳定公共方法：

- `public:getMe`
- `public:getNodesInformation`
- `public:getPublicSettings`
- `public:getVersion`
- `public:getClientRecentRecords`
- `public:getRecordsByUUID`
- `public:getPingRecords`
- `public:getPublicPingTasks`
- `public:listMetricDefinitions`
- `public:queryMetrics`
- `public:getPingMetricStats`
- `common:getNodes`
- `common:getNodesLatestStatus`
- `common:getRecords`

`admin:*` 方法会随后台能力演进。外部自动化应只调用经过验证的具体方法，并固定兼容版本，不要把后台路由列表当作永久稳定 SDK。

## 指标查询

### 指标定义

调用 `public:listMetricDefinitions` 获取当前实例实际可用的指标、类型、单位和保留期。不要把内置列表当作唯一来源。

常见内置键：

```text
cpu.usage
gpu.usage
gpu.device.usage
gpu.memory.used
gpu.memory.total
gpu.temperature
memory.used
swap.used
load.average
disk.used
net.in.rate
net.out.rate
net.total.up
net.total.down
traffic.up
traffic.down
process.count
connections.tcp
connections.udp
ping.latency_ms
ping.loss
```

### 查询时间序列

`public:queryMetrics` 请求示例：

```json
{
  "jsonrpc": "2.0",
  "method": "public:queryMetrics",
  "params": {
    "metric_keys": ["cpu.usage", "memory.used"],
    "entity_ids": ["node-uuid-1", "node-uuid-2"],
    "hours": 48,
    "server_downsample": true,
    "max_points": 500,
    "aggregation": "avg",
    "fill_empty": true
  },
  "id": "metrics-1"
}
```

主要参数：

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `metric_keys` | string[] | 必填 | 指标键；也兼容 `metric_key`、`metrics` |
| `entity_ids` | string[] | 全部可见节点 | 节点 UUID；也兼容 `entity_id` |
| `start` / `start_time` | RFC3339 | `end - hours` | 起始时间 |
| `end` / `end_time` | RFC3339 | 当前时间 | 结束时间 |
| `hours` | number | `4` | 未指定 start 时的时间范围 |
| `tags` | object | 无 | 精确匹配标签，例如 Ping 的 `task_id` |
| `server_downsample` | boolean | `true` | 是否在服务端降采样 |
| `max_points` | number | `500` | 每个指标/节点目标点数 |
| `aggregation` | string | `avg` | `avg`、`min`、`max`、`sum`、`count`、`first`、`last`、`rate`、`stddev` 或百分位 |
| `fill_empty` | boolean | `false` | 在边界和真实缺口插入 `value: null` |

还支持按指标覆盖：`max_points_by_metric`、`server_downsample_by_metric`、`aggregation_by_metric`。响应 `series[]` 按指标、节点和标签拆分，包含 `metric_key`、`entity_id`、`unit`、`downsampled`、`interval_seconds`、`points[]`。

不要在一次请求中省略 `entity_ids` 后同时查询大量指标和长时间范围；即使启用降采样，服务端仍需读取所有匹配序列。页面应按可见范围请求并缓存相同查询结果。

## CORS 与来源

浏览器主题通常与面板同源，不需要 CORS。跨域集成在启用来源检查时必须来自允许来源；管理员 API Key 请求可绕过这项来源限制，但不能绕过方法权限。

生产环境应使用 HTTPS/WSS。只有测试环境才应忽略证书错误。

## 兼容建议

1. 使用 `public:listMetricDefinitions` 做能力探测。
2. 对未知字段保持宽容，对缺失可选字段提供空状态。
3. 不依赖数组顺序，节点排序使用服务端返回权重或 UI 规则。
4. 长时间序列使用 `public:queryMetrics` 并保持降采样。
5. 将 HTTP/RPC 适配集中在一层，不要让每个组件各自维护回退逻辑。
6. Agent 协议与主题接口分开处理，Agent 细节见 [Agent RFC](/development/agent-rfc)。
