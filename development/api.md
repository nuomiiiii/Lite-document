# API 与 RPC2

Lite 同时保留兼容 HTTP API，并提供 JSON-RPC 2.0 入口。新主题和新集成优先使用 RPC2；旧 HTTP 路由主要用于兼容现有主题和脚本。Agent 只使用 [Agent RFC](/development/agent-rfc) 中的协议 2 端点。

::: warning 版本口径
本页只记录 `nuomiiiii/lite` 当前实际提供的接口。标为兼容的旧 HTTP 接口与上游对应接口保持相同调用方式；Lite 新增字段、RPC2 方法或明确差异会直接注明。未收录的上游接口不代表 Lite 支持，不要根据数据库表、后台页面请求或上游插件接口推断兼容范围。
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
| API Key | `Authorization: Bearer <api-key>` | 仅限允许 API Key 的管理接口和 `admin:*` 方法；具体限制见下文 |
| Agent | `Authorization: Bearer <client-token>` | `/api/clients/*`、`client:*`、Agent RFC |
| MCP 客户端 | 浏览器 OAuth 授权后获取的访问凭据 | `/mcp`，仅限授权中的节点和操作 |

### API Key 权限限制

以下管理操作要求管理员登录会话，不能使用 API Key：

| 操作 | 接口或受限字段 |
| --- | --- |
| 下载备份或配置包 | `GET /api/admin/download/backup` |
| 分段上传、合并或取消上传 | `/api/admin/upload/*` |
| 修改管理员用户名或密码 | `POST /api/admin/update/user` |
| 读取、上传或删除账号头像 | `/api/admin/account/avatar*` |
| 查看、添加、重命名或删除通行密钥 | `/api/admin/account/passkeys*` |
| 生成、启用或关闭 2FA | `/api/admin/2fa/*` |
| 绑定、确认或解绑 SSO 账号 | `/api/admin/oauth2/*` |
| 修改登录方式和 OIDC 提供方 | RPC `admin:editSettings` 中的 `disable_password_login`、`oauth_enabled`、`oauth_provider` 字段，以及 `admin:setOidcProvider` |
| 查看主题管理列表，安装、更新、配置、删除或切换主题 | `/api/admin/theme/*`；RPC `admin:editSettings` 中的 `theme` 字段 |
| 修改自定义 HTML | RPC `admin:editSettings` 中的 `custom_head`、`custom_body` 字段 |
| 查询或管理定时任务、执行日志与远程命令结果 | `/api/admin/scheduled-exec*`、`/api/admin/task*`；对应的定时任务和任务结果 RPC 方法 |

上述请求被拒绝时，备份、上传、账号和主题的 HTTP 接口返回 `403`，设置 HTTP 接口当前返回 `401`；直接调用对应 RPC 方法会返回权限不足错误 `-32041`。附带管理员密码或 2FA 验证码也不能把 API Key 变成管理员登录会话。

通过设置接口更新其他选项时，应只提交需要修改的字段；只要请求包含上述受限字段，即使值未变化，也会被拒绝。

服务器列表和服务器详情接口不会向 API Key 返回节点 Token；获取部署凭据必须使用管理员登录会话并完成页面要求的验证。API Key 同样不能签发或使用远程管理、MCP 授权。外部脚本应按具体接口核对支持范围，不要将 API Key 视为可调用全部后台接口的管理员登录凭据。

### API Key 可调用接口

API Key 不是只读凭证。使用下面的请求头调用 API：

```http
Authorization: Bearer <api-key>
```

公开接口不要求 API Key；带上 API Key 也不会获得额外的公开字段。需要管理权限的请求可以调用对应的 `/api/admin/*` HTTP 路由，或通过 `POST /api/rpc2` 调用允许的 `admin:*` 方法。常用可调用范围如下：

| 范围 | 常用接口或方法 | 说明 |
| --- | --- | --- |
| 公开数据 | `/api/public`、`/api/nodes`、`/api/recent/{uuid}`、`public:*`、`common:*` | 访客即可调用，不需要 API Key |
| 仪表盘与账单 | `/api/admin/dashboard*`、`/api/admin/billing/*`；对应 `admin:getDashboard*`、`admin:getBilling*` | 查询仪表盘、费用、账单记录和统计 |
| 节点资料与配置 | `/api/admin/client/list`、`/api/admin/client/{uuid}`、`/api/admin/client/add`、`/api/admin/client/{uuid}/edit`、`/api/admin/client/{uuid}/remove`、`/api/admin/client/order` | 可读取和维护节点资料；列表和详情不返回已有节点 Token，创建新节点时会返回新节点初始 Token |
| 部署与流量 | `/api/admin/client/{uuid}/deployment-profile`、`/api/admin/client/{uuid}/traffic-daily`、`/api/admin/client/{uuid}/billing/*`；对应 `admin:getClientDeploymentProfile`、`admin:saveClientDeploymentProfile` 等方法 | 可读取部署配置、流量数据和账单操作 |
| 通知与监测 | `/api/admin/notification/*`、`/api/admin/ping/*`、`/api/admin/return-route/*`；对应 `admin:*` 方法 | 可查询、配置通知规则、Ping 任务和回程线路 |
| 日志与维护 | `/api/admin/logs`、`/api/admin/database/size`、`/api/admin/database/vacuum`、`/api/admin/clipboard/*`、`/api/admin/session/*` | 可查询日志、维护数据库空间、管理命令剪贴板和会话 |
| 非敏感设置 | `GET /api/admin/settings/*`、非敏感的 `POST /api/admin/settings/`；对应 `admin:getSettings`、`admin:setDashboardSettings`、`admin:setXtermjsSettings` 等方法 | `admin:editSettings` 只能提交未列入限制表的字段；OIDC 提供方写入仍需管理员登录会话 |

例如，使用 API Key 查询仪表盘：

```bash
curl -X POST "https://monitor.example.com/api/rpc2" \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"admin:getDashboard","params":{}}'
```

`admin:exec`、定时任务及远程命令结果、远程管理授权、MCP 授权、查看或重置已有节点 Token、备份、账号安全、主题管理和受限设置字段不属于 API Key 可用范围；具体拒绝项见上一节。调用未列出的 `admin:*` 方法前，应以当前版本的接口权限返回为准，不要据此假设 API Key 等同于管理员登录会话。

### 敏感操作与 2FA

敏感管理操作的验证码支持以下传递方式：

- `X-2FA-Code: 123456`
- `X-Two-Factor-Code: 123456`
- RPC `params` 中的 `2fa_code`、`two_factor_code` 或 `otp`

API Key 不能签发或使用远程授权。

不要把管理员 Cookie、API Key、密码、2FA 验证码或远程授权放进公开主题配置。

### MCP 接入

Lite `2.3.7` 提供独立的 `/mcp` 入口。AI 客户端通过浏览器授权选择节点和有效期后，可以调用命令、交互终端和文件工具；它不获得 `admin:*` 或 Agent 身份。站点 API Key、Agent Token 和浏览器远程授权均不能用于此入口。

客户端应通过 MCP 的工具发现读取当前可用工具与参数，不要把 MCP 请求发送到 `/api/rpc2`。接入、期限、并发限制、操作记录和撤销方式见[MCP 代理与 AI 授权](/remote/mcp)，代理所需路径见[反向代理与 Tunnel](/security/reverse-proxy#cloudflare-access)。

临时授权默认 30 分钟，站点最长时长默认 24 小时，可调高到 72 小时；授权表单支持显式选择长期授权。授权详情返回布尔字段 `long_term`，客户端应据此区分类型。已有授权和未指定长期选项的申请仍按临时授权处理。

长期授权可跨浏览器会话失效和 Lite 正常重启保留，仍受撤销、站点开关和账号安全变更影响。OAuth Access Token 有效期仍为 5 分钟，客户端需使用 Refresh Token 轮换，不能把长期授权理解为 Access Token 永不过期。MCP 终端按授权有效期保持，授权到期或撤销后结束；文件上传和下载每块最多 1 MiB。

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
    "version": "2.3.7",
    "hash": "build-commit-hash",
    "deployment": "docker"
  }
}
```

`deployment` 是 Lite 扩展字段，表示当前部署类型；调用方应允许未知值。

### 节点基本信息

`GET /api/nodes`

返回可见节点数组。匿名访问会过滤隐藏节点，并固定清空 Agent `version`、私有 `remark`、`ipv4`、`ipv6`。

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
| `bandwidth` | string | 管理员填写的线路带宽文案，未填写时为空字符串 |
| `weight` | number | 排序权重 |
| `hidden` | boolean | 是否对访客隐藏 |
| `price` | number | 价格；`-1` 常表示免费 |
| `currency` | string | 货币符号 |
| `billing_cycle` | number | 计费周期，天 |
| `auto_renewal` | boolean | 是否自动续费 |
| `expired_at` | string \| null | 到期瞬间，带时区的 RFC3339 |
| `expiry_timezone` | string | 编辑和展示用的 IANA 时区，缺省为 `Asia/Shanghai` |
| `traffic_limit` | number | 配置流量额度 |
| `traffic_limit_type` | string | `max`、`min`、`sum`、`up`、`down` |
| `effective_traffic_limit` | number | 当前周期生效额度 |
| `effective_traffic_type` | string | 当前周期生效统计方式 |
| `traffic_reset_day` | number | 服务端流量重置日期；缺失表示跟随 Agent，`0` 表示关闭 |
| `traffic_reset_time` | string | 流量重置时间，格式为 `HH:MM:SS` |
| `traffic_reset_timezone` | string | 流量重置使用的 IANA 时区 |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

主题应优先使用 `effective_traffic_limit` 和 `effective_traffic_type` 展示当前周期额度，不要自行重复叠加校准值。

`bandwidth` 是管理员在服务器设置里填写的展示文案（例如 `100 Mbps`、`1 Gbps`），不是当前实时速率。未填写时为空字符串，主题应直接隐藏，不要显示占位符。实时上传/下载速度仍使用状态接口里的 `net_in_speed` / `net_out_speed`。

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
    "version": "2.3.7",
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
| `admin:*` | 管理员；部分方法允许 API Key | 后台管理，受上述 API Key 权限限制约束 |

稳定公共方法：

- `public:getMe`
- `public:getNodesInformation`
- `public:getPublicSettings`
- `public:getVersion`
- `public:getClientRecentRecords`
- `public:listMetricDefinitions`
- `public:queryMetrics`
- `public:getPingMetricStats`
- `common:getNodes`
- `common:getNodesLatestStatus`
- `common:getRecords`

`common:getNodes` 返回独立的主题节点数组。每个节点对象包含以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `uuid` | string | 节点 UUID |
| `name` | string | 节点名称 |
| `cpu_name` | string | CPU 型号 |
| `virtualization` | string | 虚拟化类型 |
| `arch` | string | 系统架构 |
| `cpu_cores` | number | 逻辑核心数 |
| `cpu_physical_cores` | number | 物理核心数，`0` 表示未知 |
| `os` | string | 操作系统 |
| `kernel_version` | string | 内核版本 |
| `gpu_name` | string | GPU 摘要 |
| `ipv4` | string | IPv4 地址；根据站点访客 IP 设置可能省略或脱敏 |
| `ipv6` | string | IPv6 地址；根据站点访客 IP 设置可能省略或脱敏 |
| `region` | string | 地区展示值 |
| `region_override` | string | 手动地区代码，未设置时为空 |
| `public_remark` | string | 公开备注 |
| `mem_total` | number | 总内存，字节 |
| `swap_total` | number | 总 Swap，字节 |
| `disk_total` | number | 总磁盘，字节 |
| `weight` | number | 排序权重 |
| `price` | number | 当前资费价格；`-1` 常表示免费 |
| `billing_cycle` | number | 计费周期，天 |
| `auto_renewal` | boolean | 是否自动续费 |
| `currency` | string | 当前资费原币种 |
| `expired_at` | string \| null | 到期瞬间，带时区的 RFC3339 |
| `expiry_timezone` | string | 编辑和展示用的 IANA 时区，缺省为 `Asia/Shanghai` |
| `group` | string | 分组 |
| `tags` | string | 以分号分隔的标签 |
| `bandwidth` | string | 管理员填写的线路带宽文案，未填写时为空字符串 |
| `hidden` | boolean | 是否对访客隐藏；匿名响应只包含可见节点 |
| `traffic_limit` | number | 当前周期配置的流量额度 |
| `traffic_limit_type` | string | `max`、`min`、`sum`、`up`、`down` |
| `traffic_reset_day` | number | 下一次流量重置日期；未启用时可能为 `0` 或省略 |
| `traffic_reset_time` | string | 流量重置时间，格式为 `HH:MM:SS` |
| `traffic_reset_timezone` | string | 流量重置使用的 IANA 时区 |
| `traffic_reset_at` | string | 下一次重置时刻，带偏移量的 RFC3339；未启用时省略 |
| `effective_traffic_limit` | number | 当前周期实际生效的流量额度 |
| `effective_traffic_type` | string | 当前周期实际生效的统计方式 |
| `remaining_value` | string | 有限资费的估算剩余价值，十进制字符串；无可计算值时省略 |
| `remaining_value_currency` | string | `remaining_value` 使用的节点资费原币种；无 `remaining_value` 时省略 |

剩余天数按到期瞬间向上取整，主题和大屏继续显示“余 X 天”，不要改成小时。`remaining_value` 使用节点当前资费版本的原币种，不是后台展示用的折算币种；内置大屏或其他公开展示端可以使用这两个字段，公开主题仍应以权威 `expired_at` 计算剩余天数。

`public:getMe` 在已登录且设置了自定义头像时返回字符串 `avatar_url`，值为 `/api/admin/account/avatar/{version}`。已登录但没有自定义头像时，该字段仍会出现，值为空字符串。访客调用返回 `logged_in: false`，并且省略 `avatar_url`。

该结构始终排除 Agent 版本、私有备注、部署状态、远程协议与远程控制状态、重置流量追加额度、内部周期标记以及 `created_at`、`updated_at`。该规则对匿名和管理员调用都生效。

匿名调用仍会过滤隐藏节点，并按访客 IP 设置返回脱敏地址或不返回地址。`/api/nodes` 作为兼容 HTTP 接口维持原结构，调用方不要假设它与 `common:getNodes` 字段完全相同。

`admin:*` 方法会随后台能力演进。外部自动化应只调用经过验证的具体方法，并固定兼容版本，不要把后台路由列表当作永久稳定 SDK。

### 管理日志查询

`GET /api/admin/logs` 支持以下查询参数：

| 参数 | 说明 |
| --- | --- |
| `limit` | 每页条数，默认 `100` |
| `page` | 从 `1` 开始的页码 |
| `q` | 在 IP 和日志内容中模糊搜索 |
| `msg_type` | 以逗号分隔的日志类型，可同时筛选多个 |
| `day` | 以逗号分隔的 UTC 日期，格式为 `YYYY-MM-DD` |

响应的 `data` 包含 `logs`、`total`、`types` 和 `days`。`types`、`days` 是全部日志的可选筛选项及记录数，不受当前分页限制；管理后台据此显示组合筛选。

成本中心管理方法包括 `admin:getBillingOverview`、`admin:getBillingServers`、`admin:getBillingMonthly`、`admin:getBillingYearly`、`admin:getBillingEntries`、`admin:createBillingTrafficReset`、`admin:createBillingIPChange`、`admin:createBillingOneTimeFee` 和 `admin:voidBillingEntry`。这些方法需要管理员权限，属于随后台演进的管理接口，不是匿名主题 API。

## 定时任务接口

Lite `2.3.7` 新增以下接口。全部要求管理员登录会话，API Key 不能查询或操作；新建、编辑、启用和立即执行还需要有效的 `exec` 范围远程授权。授权由页面完成身份验证后获取，不能用站点 API Key 或 Agent Token 替代。用户操作说明见[定时任务](/remote/schedules)。

### HTTP 与 RPC 对照

| HTTP 接口 | RPC 方法 | 参数与返回 |
| --- | --- | --- |
| `GET /api/admin/scheduled-exec` | `admin:listScheduledExec` | 返回 `schedules` 数组，包含每个任务及其最近一次执行概况 |
| `POST /api/admin/scheduled-exec` | `admin:createScheduledExec` | 提交任务配置和身份确认授权，返回 `schedule` |
| `PUT /api/admin/scheduled-exec/{id}` | `admin:updateScheduledExec` | 提交完整任务配置和身份确认授权，重新计算下次执行 |
| `DELETE /api/admin/scheduled-exec/{id}` | `admin:deleteScheduledExec` | 删除任务、关联执行记录和输出，返回 `id` |
| `POST /api/admin/scheduled-exec/order` | `admin:reorderScheduledExec` | 提交包含全部任务 ID 的 `ids` 数组，保存展示顺序 |
| `POST /api/admin/scheduled-exec/{id}/enabled` | `admin:setScheduledExecEnabled` | 提交 `enabled`；启用时还需 `grant`、`page_id`，停用无需再次验证 |
| `POST /api/admin/scheduled-exec/{id}/run` | `admin:runScheduledExec` | 提交 `grant`、`page_id`，立即执行一次，返回 `run` |
| `GET /api/admin/scheduled-exec/{id}/runs` | `admin:listScheduledExecRuns` | 返回 `runs` 数组，最多最近 50 次 |

HTTP 请求的任务 ID 由路径提供；直接调用 RPC 时放在 `params.id`。删除、停用、查询和排序要求登录会话，但不需要额外提交短期远程授权。

### 任务配置

新建和更新请求使用以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 必填，去除首尾空白后为 1–64 个字符 |
| `command` | string | 必填，非空且最多 64 KiB；保持输入的命令内容 |
| `clients` | string[] | 必填，1–100 个已存在的节点 UUID，保存时去重 |
| `enabled` | boolean | 是否启用自动调度；创建时省略则为 `false` |
| `kind` | string | `interval`、`daily`、`weekly` 或 `monthly` |
| `interval_minutes` | number | `interval` 必填，整数 `1–43200`；按天配置时先换算为分钟 |
| `time_of_day` | string | `daily`、`weekly`、`monthly` 必填，24 小时制 `HH:MM`，按北京时间计算 |
| `weekdays` | number[] | `weekly` 使用，至少一个星期；`0` 为周日，`1–6` 为周一至周六 |
| `weekday` | number | 单星期兼容字段；未提交 `weekdays` 时使用该值 |
| `month_day` | number | `monthly` 必填，整数 `1–31`；不存在的日期按当月最后一天执行 |
| `grant` | string | 新建、更新时必填，当前 `exec` 身份确认授权 |
| `page_id` | string | 必须与签发 `grant` 时的页面标识一致 |

创建、更新、启用或立即执行会消费当前授权，并可能在响应中返回 `next_grant` 和 `expires_at`。后续操作应使用新的授权；轮换不会延长原身份确认的 10 分钟有效期。更新是完整配置保存，省略字段不会自动沿用原值。

全站最多保存 30 个任务，已停用任务也计入。列表顺序只用于展示；`ids` 排序数组必须完整包含当前所有任务，不能重复或遗漏。

### 任务与执行记录

任务对象返回名称、命令、节点、启用状态和定时配置，并增加以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 定时任务 ID |
| `disabled_reason` | string | 自动停用原因：`security` 为账号安全变更，`remote_off` 为站点关闭远程管理；无原因时省略 |
| `last_run_at` | string | 最近一次自动调度的时间，RFC3339；未执行时可省略 |
| `next_run_at` | string | 下一次计划时间，RFC3339；任务停用时不要据此判断仍会执行 |
| `last_run` | object | 最近一次执行概况，无记录时省略 |

执行记录的字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 本次执行记录 ID |
| `task_id` | string | 对应远程命令任务 ID；没有创建命令任务时省略 |
| `status` | string | `dispatched` 已进入投递流程、`skipped` 跳过、`failed` 未能执行 |
| `note` | string | 补充原因，无原因时省略 |
| `sent` | number | 已交给当前连接的节点数 |
| `queued` | number | 等待协议通道投递的节点数 |
| `offline` | number | 离线且本次不投递的节点数 |
| `failed` | number | 不可执行或投递失败的节点数 |
| `started_at` | string | 本轮处理时间，RFC3339 |

`note` 可为 `still_running`、`no_targets`、`no_clients`、`create_failed`、`remote_closed`、`persist_error` 或 `superseded`。`dispatched` 不代表命令已成功结束；有 `task_id` 时，通过 `GET /api/admin/task/{task_id}/result` 或 `admin:getTaskResultsByTaskId`（参数为 `task_id`）读取各节点的 `client`、`result`、`exit_code` 和 `finished_at`。这些结果接口同样拒绝 API Key。

立即执行不修改定时时间，也不会启用已停用任务。自动调度会在上一次仍有未完成结果时跳过本轮；离线节点不会收到本次命令，也不会在上线后补发。定时方式、重启、停用和安全变更的行为见[定时任务](/remote/schedules)。

## 通知渠道与事件

通知连接参数和事件分配分别保存。以下管理接口可使用管理员登录会话或 API Key，公开主题不应调用。

### 渠道配置与测试

| HTTP 接口 | RPC 方法 | 参数与行为 |
| --- | --- | --- |
| `GET /api/admin/settings/message-sender` | `admin:getMessageSenderProvider` | 不传 `provider` 时返回已注册渠道及其参数定义 |
| `GET /api/admin/settings/message-sender?provider=JavaScript` | `admin:getMessageSenderProvider` | `provider` 为实际渠道名，返回该渠道已保存的 `name` 和 `addition` |
| `POST /api/admin/settings/message-sender` | `admin:setMessageSenderProvider` | 提交 `name` 和 `addition`；保存连接参数，不改变事件分配 |
| `POST /api/admin/test/sendMessage` | `admin:testSendMessage` | 必须提交 `provider`；只测试这一渠道，绕过通知总开关、事件分配和汇总窗口 |

保存和测试请求字段：

| 字段 | 类型 | 用途 |
| --- | --- | --- |
| `name` | string | 保存时必填，使用渠道查询返回的实际名称，例如 `JavaScript` |
| `addition` | string | 保存时使用的 JSON 字符串，内容按对应渠道的参数定义填写 |
| `provider` | string | 查询指定配置或测试时使用的渠道名；测试时不能为空 |

### 事件分配与汇总

通过 `admin:getSettings` 读取、`admin:editSettings` 保存以下字段，也可使用对应的 `/api/admin/settings/` HTTP 接口：

| 字段 | 类型 | 默认值与说明 |
| --- | --- | --- |
| `notification_enabled` | boolean | 通知总开关 |
| `notification_routes` | object | 事件种类到渠道名数组的完整分配表；每类可指定多个渠道，空数组表示不发送 |
| `notification_digest_enabled` | boolean | 默认 `false`，是否汇总相同内容的通知 |
| `notification_digest_seconds` | number | 默认 `5`，允许 `1–3600` 的整数秒 |

`notification_routes` 中的事件种类：

| 值 | 事件 |
| --- | --- |
| `offline` / `online` | 离线 / 上线 |
| `load` | 负载异常 |
| `traffic` | 流量用量 |
| `expire` / `renew` | 到期提醒 / 自动续费 |
| `login` | 登录 |
| `ping_loss` / `ping_latency` | 丢包异常 / 延迟异常 |
| `traffic_report_daily` | 流量日报 |
| `traffic_report_weekly` | 流量周报 |
| `traffic_report_monthly` | 流量月报 |
| `return_route` | 回程线路变化与恢复 |
| `mainland_reachability` | 疑似被墙与大陆方向可达性恢复 |

保存 `notification_routes` 会替换整张分配表，省略的事件种类会被补为空数组。只修改其中一类时，应先读取当前分配，合并后完整提交。渠道名必须已注册，不能使用 `none` 或 `empty`；不要继续依赖旧 `notification_method` 字段调整事件分配。

开启汇总后，告警及其恢复中仅 `kind`、`event`、`message` 和 `emoji` 完全相同的事件会合并，`clients` 按节点去重，`time` 使用其中最新的事件时间。通知在从首条事件开始计算的汇总窗口结束后发送；`login`、流量日报/周报/月报和测试消息不进入汇总。

### JavaScript 事件字段

JavaScript 渠道必须实现 `sendMessage(message, title)`，可额外实现 `sendEvent(event)` 接收结构化事件；没有 `sendEvent` 时会回退为文本发送。字段如下：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `kind` | string | 事件分配使用的种类，见上表；测试等没有种类的事件可能省略 |
| `event` | string | 事件标题，异常与恢复可能使用不同标题 |
| `clients` | object[] \| null | 关联服务器；无关联节点时可为空，汇总后可能包含多个节点 |
| `time` | string | 带时区的 RFC3339 事件时间 |
| `message` | string | 事件正文 |
| `emoji` | string | 事件图标文本，可能为空 |

模板应兼容 `kind` 缺失和 `clients` 为空的事件。使用与 Telegram 模板说明见 [通知与告警](/admin/notifications)。

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

不要在省略 `entity_ids` 的同时查询大量指标和长时间范围。页面应按可见节点和时间范围请求，并短时复用参数相同的结果。

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
