# 节点管理接口 <PlusBadge />

本页仅适用于 Lite-Plus。节点管理方法使用 `admin:nodemgt.*` 命名空间，通过 `POST /api/rpc2` 或 RPC2 WebSocket 调用；Lite 普通版不提供这些方法。通用响应与认证约定见[API 与 RPC2](/development/api)。

## 认证与单位

当前实现允许管理员登录会话或 API Key 调用这些节点管理方法，包含写操作。节点用户凭据、订阅 Token 和 MCP 授权不具备调用权限。这里的 API Key 支持范围仅指 `admin:nodemgt.*`，不扩大共用手册中账号安全、主题、备份和远程授权等接口的权限。

- 容量、已用量、加量字段使用整数**字节**。
- `rate_limit_bps` 使用整数 **bit/s**，例如 `10000000` 表示 `10 Mbit/s`，与通用监控速率字段的字节/秒不同。
- `device_limit` 表示每节点并发来源 IP 上限，`0` 不限制。
- 时间使用带时区的 RFC3339；空到期时间使用 `null`。
- 写接口不应当作任意字段的局部更新接口。编辑时先读取现有记录，再提交所需完整配置，尤其保留用户入站范围、期限和订阅启用状态。

## 方法一览

下面的方法名均需加上 `admin:nodemgt.` 前缀。

| 方法 | 主要参数 | 返回与用途 |
| --- | --- | --- |
| `inbound.list` | 可选 `node_uuid` | 入站数组 |
| `inbound.upsert` | 入站字段，编辑时带 `id` | 保存后的入站，排队下发 |
| `inbound.reorder` | `node_uuid`、有序 `ids` | 调整订阅入站顺序 |
| `inbound.delete` | `id` | 删除入站 |
| `outbound.list` / `route.list` | 可选 `node_uuid` | 出站 / 路由数组 |
| `outbound.upsert` / `route.upsert` | 对应配置，编辑时带 `id` | 保存记录并排队下发 |
| `outbound.delete` / `route.delete` | `id` | 删除对应配置 |
| `user.list` | 可选 `node_uuid` | 用户、入站授权、套餐、在线状态与 IP、外部链接 |
| `user.upsert` | 用户字段、`inbound_ids`、`plan_id`、可选 `extra_links` | 保存用户并同步相关节点 |
| `user.setStatus` | `id`、`status`、可选 `operation_id` | 设置 `active`、`disabled` 或 `expired` |
| `user.clearIPs` / `user.delete` | `id` | 清理 IP 记录 / 删除用户及关联配置 |
| `credential.issue` | `user_id`、`kind`、可选 `secret` | 返回 `credential` 和明文 `secret`；`kind` 默认 `uuid` |
| `credential.rotate` / `credential.revoke` | 凭据 `id` | 更换 / 吊销节点用户凭据 |
| `plan.list` / `plan.upsert` / `plan.delete` | 查询无参数；保存用套餐字段；删除用 `id` | 套餐查询与维护，变更同步现有分配用户 |
| `assignment.assign` | `user_id`、`plan_id`、`operation_id` | 分配套餐，返回分配记录 |
| `assignment.renew` | `user_id`、`operation_id` | 延长已有套餐期限 |
| `assignment.topup` | `user_id`、`extra_bytes`、`operation_id` | 增加额度，不清零已用量 |
| `assignment.modify` | `user_id`、可选额度/速率/IP 字段及 `operation_id` | 调整额度、限速和在线 IP 上限 |
| `cert.list` | 可选 `node_uuid` | 证书数组 |
| `cert.request` / `cert.renew` | `node_uuid`、`domain`、来源及路径等 | 请求 CSR 签发流程或绑定节点文件 |
| `cert.delete` | `id` | 删除证书记录并同步节点 |
| `subscription.list` | 无 | 用户订阅、地址、路径和格式 |
| `subscription.upsert` | `user_id`、`format`、`enabled` 等 | 保存订阅 |
| `subscription.preview` | 订阅 `id`、可选 `format` | `body`、`content_type`、`token`、`path`、`url` |
| `subscription.delete` | `id` | 删除当前订阅记录；用户仍在时可重新生成 |
| `settings.get` / `settings.set` | 查询无参数；保存用设置字段 | 签发与订阅入口设置 |
| `control.status` | 可选 `node_uuid` | 单节点状态对象；未指定节点时返回数组 |
| `control.sync` | 可选 `node_uuid` | 尝试投递待下发命令 |
| `diag.status` | 可选 `node_uuid` | 待下发命令、最新结果及内核信息 |
| `audit.list` | 可选 `limit` | 操作者、动作、目标与时间 |

分配、续费和加量重试时，复用同一个 `operation_id`，避免重复记账。没有已有套餐分配的用户不能调用续费完成延期。

## 查询示例

```sh
curl -X POST "https://monitor.example.com/api/rpc2" \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"admin:nodemgt.inbound.list","params":{}}'
```

## 入站常用字段

`admin:nodemgt.inbound.upsert`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 新建可省略，编辑传原 ID |
| `node_uuid`、`name` | string | 必填，节点 UUID 与名称 |
| `protocol`、`core` | string | 协议与 `xray` / `sing-box` 内核 |
| `listen`、`stack` | string | 监听 IP；地址栈为 `ipv4`、`ipv6`、`dual` |
| `port` | integer | 实际监听端口 |
| `enabled` | boolean | 是否启用 |
| `transport`、`security` | string | 传输及 `none`、`tls`、`reality` 等安全方式 |
| `cert_id`、`sni`、`alpn` | string | TLS 证书和安全参数 |
| `flow` | string | 入站默认 VLESS Flow |
| `reality_dest`、`reality_server_names`、`reality_short_id` | string | Reality 参数；密钥缺省可由服务端生成 |
| `ws_path`、`ws_host`、`grpc_service`、`grpc_multi` | string / boolean | WebSocket / gRPC 参数 |
| `http_path`、`http_host`、`http_mode` | string | HTTPUpgrade / XHTTP 参数 |
| `sniffing`、`route_only` | boolean | 嗅探及仅用于路由，Reality / Vision 会约束后者 |
| `dest_override` | string | 逗号分隔的嗅探类型 |
| `sort_index` | integer | 订阅顺序，越小越靠前 |
| `share_strategy` | string | `node`、`listen`、`other`、`none` |
| `public_host`、`public_port` | string / integer | 生成分享地址使用的公开目标 |
| `exclude_from_sub` | boolean | 是否从订阅排除 |

读取返回会包含配置和版本、创建/更新时间。节点应用结果需要另外查询 `control.status`，不能仅凭保存接口成功判断已经监听。

## 出站与路由字段

`admin:nodemgt.outbound.upsert`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 新建省略，编辑传原 ID |
| `node_uuid`、`name` | string | 必填，所属节点与该节点唯一的出站标签 |
| `core`、`protocol` | string | 内核与协议；直连为 `freedom`，阻断为 `blackhole` |
| `enabled` | boolean | 是否启用 |
| `address`、`dest_port` | string / integer | 目标地址与端口；目标端口字段不是 `port` |
| `uuid`、`username`、`password`、`ss_method` | string | 按目标协议填写凭据与加密方法 |
| `transport`、`security`、`sni`、`fingerprint`、`flow` | string | 目标传输与安全参数 |
| `ws_path`、`ws_host`、`grpc_service` | string | WebSocket / gRPC 参数 |
| `reality_public_key`、`reality_short_id`、`spider_x` | string | Reality 客户端参数 |
| `via_outbound` | string | 同节点前置出站标签，空值表示不使用 |
| `domain_strategy` | string | 直连域名策略，如 `AsIs`、`UseIPv4` |
| `source_inbound_id` | string | 从已有入站导入时的来源记录 |

`admin:nodemgt.route.upsert`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id`、`node_uuid`、`name` | string | 记录 ID、所属节点和规则名称；新建省略 ID |
| `priority` | integer | 越小越先匹配 |
| `enabled` | boolean | 是否启用 |
| `inbound_id` | string | 空值匹配节点全部入站，也可限定一个入站 |
| `outbound_id` | string | 必填，目标出站或节点默认 `direct` / `block` |
| `domain`、`ip` | string | 逗号分隔的域名、IP 或 Geo 条件 |
| `network`、`protocol` | string | TCP / UDP 网络与嗅探协议条件 |
| `port`、`source` | string | 目标端口与来源 IP 条件 |

路由条件与目标必须属于同一节点，字段填写例子见[出站与路由](/plus/forwarding)。

## 用户与套餐字段

<div class="user-plan-fields-table">

| 对象 | 字段 | 类型 / 说明 |
| --- | --- | --- |
| 用户 | `username`、`display_name` | string，用户名与备注 |
| 用户 | `inbound_ids` | string[]，明确提交该用户完整入口范围 |
| 用户 | `plan_id` | string，空值会解除套餐关联 |
| 用户 | `status` | `active`、`disabled`、`expired` |
| 用户 | `expires_at` | RFC3339 或 `null` |
| 用户 | `traffic_reset_day` | integer，`0–31`，按北京时间重置 |
| 用户 | `flow` | string，用户 Flow |
| 用户 | `rate_limit_bps`、`device_limit` | integer，bit/s 与并发 IP 上限 |
| 用户 | `extra_links` | 外部链接对象数组，省略保持原值，空数组清空 |
| 套餐 | `name`、`duration_days` | string / integer，套餐名称与天数 |
| 套餐 | `traffic_bytes`、`rate_limit_bps`、`device_limit` | integer，流量、限速、在线 IP 上限 |

</div>

`user.list` 还返回 `quota_bytes`、`used_bytes`、`plan_name`、`inbound_names`、`online`、`online_ips` 等视图字段。`online_ips` 中包含 `ip` 和 `seen_at`，为近期在线信息。套餐更新会影响当前使用它的用户，续费仅延期。

通过接口创建用户时，`user.upsert` 会生成订阅记录，连接凭据需再调用 `credential.issue`；后台新建用户会自动完成这一步。

`assignment.modify` 可选参数为 `quota_bytes`、`rate_limit_bps` 和 `device_limit`。省略的字段保持原值；当前 `device_limit` 只有大于 `0` 时才更新，传 `0` 不会清除原限制。到期时间通过 `user.upsert` 的 `expires_at` 设置。

`extra_links` 中每项使用以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 编辑已有项时保留原 ID |
| `kind`、`value` | string | `link` 为单条分享链接，`subscription` 为远程订阅地址 |
| `remark`、`name_prefix` | string | 备注与外部订阅节点名称前缀 |
| `enabled`、`sort_index` | boolean / integer | 是否加入订阅及排序 |
| `expires_at` | RFC3339 / null | 该外部项的到期时间，`null` 不设置期限 |

## 证书字段

`cert.request` 与 `cert.renew` 使用同一组参数：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 新建省略，续期或重新读取时传原证书 ID |
| `node_uuid`、`domain` | string | 必填，目标节点和证书域名 |
| `source` | string | `acme` 主控申请，`file` 读取节点文件 |
| `cert_path`、`key_path` | string | 文件来源的节点证书链与私钥完整路径 |
| `csr_pem` | string | 可选 CSR；常规流程省略，由 Agent 在节点生成 |
| `test_ca` | boolean | 是否使用测试 CA，正式客户端使用时保持 `false` |

返回证书记录中的 `status`、`last_error`、`not_after`、`fingerprint` 可用于查询结果；主控签发配置见下一节，节点操作见[节点证书](/plus/certificates)。

## 订阅与签发设置

`admin:nodemgt.settings.set` 采用以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `cf_api_token` | string | Cloudflare Token；空值保留，查询只返回 `cf_api_token_set` |
| `cf_zone_id`、`acme_email` | string | Cloudflare 区域与联系邮箱 |
| `sub_listen_port` | integer | `0–65535`，`0` 不单独监听 |
| `sub_public_port` | integer | 对外端口，`0` 跟随监听端口 |
| `sub_path` | string | 非根路径的订阅前缀 |
| `sub_public_host` | string | 对外地址，可包含 HTTP / HTTPS 协议 |

`subscription.upsert` 使用 `id`、`user_id`、`token`、`format`、`enabled`、`extra_urls`。编辑时保留原 `id` 和 `token`；`extra_urls` 为换行分隔的外部地址，逐项启用、备注和到期控制使用用户的 `extra_links`。`subscription.list` 返回完整订阅地址的 `path`、`url`，`subscription.preview` 另返回渲染内容 `body` 与 `content_type`。

订阅 HTTP 入口是配置后的 `<sub_path><token>`，不是固定 `/sub/:token`。可用 `?format=xray`、`clash`、`sing-box`、`base64` 选择输出。无效或停用订阅、停用或到期用户返回 `404`；错误格式返回 `400`。该入口通过独立订阅 Token 获取内容，不使用管理员 API Key 认证。

## 下发状态与 Agent 扩展

`control.status` 返回 `node_uuid`、`operation_id`、`kind`、`status`、`last_error`、`created_at`、`updated_at`。页面状态使用 `saved`、`sent`、`applied`、`failed`；尚无记录时可能为 `not_started`。

Plus 的 Agent v2 通道额外使用 `nodemgt.control`、`nodemgt.controlResult`、`nodemgt.usage` 和 `nodemgt.presence`。它们由节点身份认证，分别承载配置、回执、流量和在线信息；不能当作管理员 RPC 方法调用，也不能假定普通 Lite-agent 实现了这些扩展。
