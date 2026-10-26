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
| `user.upsert` | 用户字段、`inbound_ids`、`plan_id`、可选 `extra_links` | 保存用户并同步相关节点；新用户自动创建订阅与连接凭据，响应附带明文 `secret` |
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
| `cert.request` / `cert.renew` | `node_uuid`、`source` 及对应来源字段 | 下发根证书、请求 CSR 签发流程或绑定节点文件 |
| `cert.set_auto_renew` | `id`、`auto_renew` | 设置单节点主控申请证书的自动续签 |
| `cert.delete` | `id` | 删除没有入站引用的证书记录并同步节点 |
| `root_cert.list` | 无 | 根域名证书数组，返回状态和有效期等安全视图 |
| `root_cert.issue` | `domain`，可选 `id`、`sync`、`test_ca` | 申请或续签根域名及通配域名证书，并向关联节点下发 |
| `root_cert.set_auto_renew` | `id`、`auto_renew` | 设置根域名证书的自动续签 |
| `root_cert.delete` | `id` | 删除没有节点证书引用的根证书 |
| `subscription.list` | 无 | 用户订阅、地址、路径和格式 |
| `subscription.upsert` | `user_id`、`format`、`auto_detect`、`enabled` 等 | 保存订阅 |
| `subscription.preview` | 订阅 `id`、可选 `target`、`format`、`user_agent` | 配置内容、客户端、模板、兼容性提示与订阅地址 |
| `subscription.delete` | `id` | 删除当前订阅记录；用户仍在时可重新生成 |
| `template.list` | 无 | `templates`、`builtins`、`bindings` |
| `template.upsert` | `name`、`kind`、`content`，编辑时带 `id` | 保存并返回模板 |
| `template.delete` | `id` | 删除未被绑定的模板 |
| `template.bind` | `scope`、`scope_id`、`client`、`template_id` | 设置或清除指定范围的客户端模板绑定 |
| `template.preview` | `subscription_id`、`target`、`template` | 使用指定订阅的授权节点预览模板，可预览未保存内容 |
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
| `port` | integer | 实际监听端口，显式填写 `1–65535`；省略或非正数使用 `443`，不会随机分配，超过 `65535` 报错 |
| `enabled` | boolean | 是否启用 |
| `transport`、`security` | string | 传输及 `none`、`tls`、`reality` 等安全方式 |
| `cert_id`、`sni`、`alpn` | string | TLS 证书和安全参数 |
| `flow` | string | 入站默认 VLESS Flow；Xray、sing-box 的 VLESS + TCP + TLS/Reality 均支持 Vision |
| `ss_method` | string | Shadowsocks 加密方法，默认 `2022-blake3-aes-128-gcm` |
| `accounts` | object[] | HTTP 入站的用户名密码数组，每项为 `{"user":"用户名","pass":"密码"}` |
| `allow_transparent` | boolean | HTTP 入站透明转发开关，默认 `false`，按所选内核支持情况使用 |
| `reality_dest`、`reality_server_names`、`reality_short_id` | string | Reality 参数；密钥缺省可由服务端生成 |
| `ws_path`、`ws_host`、`grpc_service`、`grpc_multi` | string / boolean | WebSocket / gRPC 参数 |
| `http_path`、`http_host`、`http_mode` | string | HTTPUpgrade / XHTTP 参数 |
| `sniffing`、`route_only` | boolean | 嗅探及仅用于路由，Reality / Vision 会约束后者 |
| `dest_override` | string | 逗号分隔的嗅探类型 |
| `sort_index` | integer | 订阅顺序，越小越靠前 |
| `share_strategy` | string | `node`、`listen`、`other`、`none` |
| `public_host`、`public_port` | string / integer | 生成分享地址使用的公开目标 |
| `exclude_from_sub` | boolean | 是否从订阅排除 |

HTTP 协议使用 `http`，传输为 `tcp`，安全方式为 `none` 或 `tls`。保存时会忽略用户名或密码为空的账户，同名账户只保留第一组；没有有效账户时自动生成一组，调用方应读取保存结果。

VLESS 用户的非空 `flow` 覆盖入站默认值，订阅携带最终 Flow。sing-box 使用 `xtls-rprx-vision`，带 Vision 的 `udp443` 形式会转换为此值；WebSocket、其他非 TCP 传输或明文入站不携带 Flow。Reality 缺省目标为 `addons.mozilla.org:443`，SNI 从目标主机名生成。组合与配套版本见[VLESS Vision](/plus/inbounds#vless-vision)。

读取返回会包含配置和版本、创建/更新时间，以及 `accounts`、`allow_transparent` 等字段。Shadowsocks 的 `ss_password` 为读取返回的服务器密钥，不是 `inbound.upsert` 的写入参数；SS2022 用户连接还需要配合用户密钥，应使用订阅生成的完整密码。

节点应用结果需要另外查询 `control.status`，不能仅凭保存接口成功判断已经监听。

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

路由条件与目标必须属于同一节点。不同非空条件之间为“且”，同一字段中逗号分隔的值为“或”；`network`、`protocol` 为空表示不限。普通域名按后缀匹配，也支持 `domain:`、`full:`、`keyword:`、`regexp:` / `regex:` 和 `geosite:`。中国域名和中国 IP 任一命中即直连时，应拆为两条规则，字段示例见[出站与路由](/plus/forwarding#匹配方式)。

## 用户与套餐字段

<div class="user-plan-fields-table">

| 对象 | 字段 | 类型 / 说明 |
| --- | --- | --- |
| 用户 | `username`、`display_name` | string，用户名与备注 |
| 用户 | `inbound_ids` | string[]，明确提交该用户完整入口范围 |
| 用户 | `plan_id` | string，空值会解除套餐关联 |
| 用户 | `status` | `active`、`disabled`、`expired` |
| 用户 | `expires_at` | RFC3339 设置时间，`null` 清除；省略保留当前到期时间 |
| 用户 | `traffic_reset_day` | integer，`0–31`，按北京时间重置 |
| 用户 | `flow` | string，用户 Flow |
| 用户 | `rate_limit_bps`、`device_limit` | integer，bit/s 与并发 IP 上限 |
| 用户 | `extra_links` | 外部链接对象数组，省略保持原值，空数组清空 |
| 套餐 | `name`、`duration_days` | string / integer，套餐名称与天数 |
| 套餐 | `traffic_bytes`、`rate_limit_bps`、`device_limit` | integer，流量、限速、在线 IP 上限 |

</div>

`user.list` 还返回 `quota_bytes`、`used_bytes`、`plan_name`、`inbound_names`、`online`、`online_ips` 等视图字段。`online_ips` 中包含 `ip` 和 `seen_at`，为近期在线信息。套餐更新会影响当前使用它的用户，续费仅延期。

通过接口创建用户时，`user.upsert` 会自动生成订阅记录和 UUID 连接凭据，响应中的 `secret` 为本次签发的明文凭据，无需再调用 `credential.issue`。编辑用户不会重新签发；需要另行签发或更换时，再使用对应凭据方法。

`user.upsert` 的到期时间按以下方式处理：

<div class="plus-settings-table">

| `expires_at` | 行为 |
| --- | --- |
| 省略 | 保留当前到期时间；本次分配套餐生成的到期时间也会保留 |
| `null` | 清除到期时间，表示不过期 |
| RFC3339 字符串 | 设置指定时间，例如 `"2026-12-31T23:59:59+08:00"` |

</div>

用户资料、入站授权、套餐、期限、外部链接和新用户凭据在同一事务中保存。编辑仍应提交完整的 `inbound_ids`、`plan_id` 等配置；到期时间的省略行为不代表其他字段也支持局部更新。

`assignment.modify` 可选参数为 `quota_bytes`、`rate_limit_bps` 和 `device_limit`，省略的字段保持原值。`device_limit` 传正整数设置上限，传 `0` 可清除上限，负数报错。到期时间通过 `user.upsert` 的 `expires_at` 设置。

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

<div class="plus-settings-table">

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 新建省略，续期或重新读取时传原证书 ID |
| `node_uuid` | string | 必填，目标节点 UUID |
| `source` | string | `root` 根证书下发、`acme` 主控申请、`file` 读取节点文件 |
| `domain` | string | `acme` / `file` 必填；`root` 使用所选根证书的域名 |
| `root_cert_id` | string | `root` 必填，已经签发的根证书 ID |
| `share_domain` | string | `root` 必填，节点实际使用的域名，须为根域名本身或其一级子域名 |
| `cover_wildcard` | boolean | `acme` 可选，控制是否同时申请该域名的通配域名；后台单节点申请使用指定域名 |
| `cert_path`、`key_path` | string | 文件来源的节点证书链与私钥完整路径 |
| `csr_pem` | string | 可选 CSR；常规流程省略，由 Agent 在节点生成 |
| `test_ca` | boolean | 是否使用测试 CA，正式客户端使用时保持 `false` |

</div>

省略 `source` 时，带 `root_cert_id` 视为根证书下发，带文件路径视为节点文件，否则使用主控申请。建议调用方明确传入来源及其必填字段。

返回证书记录中的 `status`、`last_error`、`not_after`、`fingerprint` 可用于查询结果，还包含 `source`、`root_cert_id`、`share_domain`、`cover_wildcard` 和 `auto_renew`。自动续签通过 `cert.set_auto_renew` 修改；根证书下发记录跟随根证书更新，节点文件由外部工具续期。

`cert.delete` 会拒绝删除仍被入站引用的证书，停用中的入站也计入引用。先在全部关联入站中解除或替换证书绑定并保存，再删除证书，见[删除证书](/plus/certificates#删除证书)。

### 根域名证书

`admin:nodemgt.root_cert.issue`：

<div class="plus-settings-table">

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `domain` | string | 必填，如 `example.com`，申请该域名及 `*.example.com` |
| `id` | string | 续期或重试传原 ID；新建省略，同域名已有记录时复用该记录 |
| `sync` | boolean | 默认 `false`，异步申请并返回 `pending`；设为 `true` 时等待申请结果 |
| `test_ca` | boolean | 测试用途，默认 `false`；正式使用前先保存 Cloudflare Token 与 ACME 邮箱 |

</div>

异步申请后使用 `root_cert.list` 查询状态。`root_cert.issue` 和 `root_cert.list` 返回 `id`、`domain`、`fingerprint`、`issuer`、`not_after`、`auto_renew`、`status`、`last_error`、`created_at`、`updated_at`，不返回私钥或证书原文。

新建根证书和主控申请的节点证书默认开启自动续签。调用 `root_cert.set_auto_renew` 时提交 `id` 与布尔值 `auto_renew`；`cert.set_auto_renew` 使用相同字段。续签窗口和后台操作见[自动续签与手动续期](/plus/certificates#自动续签与手动续期)。

根证书的私钥由主控生成并加密保存，向节点下发时同时发送证书链与私钥；单节点主控申请仍由 Agent 生成私钥与 CSR。根证书仍被节点证书引用时，`root_cert.delete` 会拒绝删除。主控签发设置见下一节，完整操作见[节点证书](/plus/certificates)。

## 订阅与签发设置

`admin:nodemgt.settings.set` 采用以下字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `cf_api_token` | string | Cloudflare Token；空值保留，查询只返回 `cf_api_token_set` |
| `acme_email` | string | ACME 联系邮箱；保存签发设置时必填，省略保持原值，空字符串会报错 |
| `clear_issuer` | boolean | `true` 清空已保存的 Cloudflare Token 和 ACME 邮箱；此时忽略同次请求中的这两个字段 |
| `sub_listen_port` | integer | `0–65535`，`0` 沿用面板入口；非零时只通过独立端口提供订阅，面板端口上的订阅请求返回 `404` |
| `sub_public_port` | integer | 对外端口，`0` 跟随监听端口 |
| `sub_path` | string | 非根路径的订阅前缀 |
| `sub_public_host` | string | 手动填写的实际对外地址，可包含 HTTP / HTTPS 协议；泛域名证书填写客户端实际访问的主机名 |
| `sub_reuse_https` | boolean | 是否复用面板内置 HTTPS 的证书与私钥；开启前需配置有效的面板证书，非零订阅监听端口将使用 HTTPS |

主控根据证书申请中的 `domain` 自动识别 Cloudflare 区域。Token 的权限及配置操作见[保存签发设置](/plus/certificates#保存签发设置)。

`settings.get` 返回订阅入口设置和 `acme_email`，并包含以下只读字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `cf_api_token_set` | boolean | 是否已保存 Cloudflare Token，不返回 Token 原文 |
| `sub_domain` | string | 复用 HTTPS 时从面板证书提取的域名信息；不复用时为空，不用于自动填写或优先生成订阅地址 |
| `https_certificate_path` | string | 面板已有证书链路径，由主控读取，Docker 使用容器内路径 |
| `https_private_key_path` | string | 面板已有私钥路径，由主控读取 |
| `https_domains` | string[] | 面板证书包含的域名 |

`sub_public_host` 省略时保留原值，传空字符串时清空。开启或关闭复用不会用证书域名覆盖此值；生成订阅地址只使用已填写的对外地址，留空时返回相对路径。修改订阅监听端口、URL 路径或复用开关会重载订阅服务。面板证书通过面板 HTTPS 设置管理，操作步骤见[复用内置 HTTPS](/plus/subscriptions#复用内置-https)。

## 订阅字段与预览

`admin:nodemgt.subscription.upsert`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 新建省略，编辑保留原订阅 ID |
| `user_id` | string | 必填，所属节点用户 |
| `token` | string | 编辑时保留原 Token，避免改变用户订阅地址 |
| `format` | string | 固定格式及自动识别失败时的回退格式，常用 `xray`、`base64`、`clash`、`sing-box` |
| `auto_detect` | boolean | 是否根据请求 User-Agent 识别客户端；默认 `false`，旧订阅升级后保持关闭 |
| `enabled` | boolean | 是否启用订阅 |
| `extra_urls` | string | 换行分隔的外部订阅地址；逐项启用、备注和到期控制使用用户的 `extra_links` |

`subscription.list` 返回上述订阅设置，以及 `username`、`path`、`url` 和创建、更新时间。

`subscription.preview` 的参数：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 必填，订阅 ID |
| `target` | string | 可选，显式选择客户端，如 `mihomo`、`loon`、`surge`、`surge-mac`、`stash`、`clash`、`sing-box`、`v2ray` |
| `format` | string | 可选，指定原有输出格式；优先级低于 `target` |
| `user_agent` | string | 可选，模拟客户端标识；订阅开启 `auto_detect` 且未传 `target`、`format` 时参与识别 |

预览返回 `body`、`content_type`、`client`、`template_id`、`warnings`，以及 `token`、`path`、`url`。`body` 与实际订阅响应一致，分享链接订阅为 Base64 内容；`warnings` 提示所选客户端不兼容的节点等信息。`url` 为订阅基础地址，生成固定客户端链接时追加 `target` 参数。

HTTP / HTTPS 订阅入口为配置后的 `<sub_path><token>`。输出选择顺序为 `target` → `format` → 自动识别 → 已保存格式。`target` 与自动识别使用客户端模板；`v2ray` 返回 Base64 分享链接。原有 `format=clash`、`format=sing-box` 保持节点列表输出，详细行为见[选择格式与预览](/plus/subscriptions#选择格式与预览)。

配置非零 `sub_listen_port` 后，此入口只在独立订阅端口提供；面板 HTTP / HTTPS 端口上的订阅路径返回 `404`，反向代理需回源到独立端口。设为 `0` 时继续沿用面板入口。

无效 Token、停用订阅、停用或到期用户，以及无法生成配置的请求返回 `404`。该入口使用独立订阅 Token，不使用管理员 API Key；响应设置 `Cache-Control: no-store`、`Vary: User-Agent`，并通过 `X-Subscription-Client` 标明选定客户端。

## 模板字段与绑定

`admin:nodemgt.template.upsert`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 新建省略，编辑传原模板 ID |
| `name` | string | 必填，模板名称，最长 100 字节 |
| `kind` | string | 必填，`clash`、`loon`、`surge` 或 `sing-box`；保存后不能更换类型 |
| `content` | string | 必填，对应类型的完整配置，最大 `1 MiB`；保存前会解析并清除静态代理节点 |

返回模板记录及 `revision`、`created_at`、`updated_at`。新建时 `revision` 为 `1`，编辑成功后递增。`template.list` 同时返回已保存的 `templates`、内置基础配置 `builtins` 和当前 `bindings`。

`admin:nodemgt.template.bind`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `scope` | string | `global` 系统默认、`plan` 套餐、`subscription` 用户订阅 |
| `scope_id` | string | 系统默认传空字符串；套餐传套餐 ID；订阅传订阅 ID，非用户 ID |
| `client` | string | `mihomo`、`clash`、`stash`、`loon`、`surge`、`surge-mac`、`sing-box`；`v2ray` 不绑定模板 |
| `template_id` | string | 模板 ID；传空字符串移除该范围与客户端的绑定，恢复继承 |

客户端与模板类型需对应：Mihomo / Clash / Stash 使用 `clash`，Surge iOS / macOS 使用 `surge`。每个范围的每个客户端单独绑定；后台星标设为同类型客户端默认时，会逐个客户端调用此方法。

模板按“订阅专属 → 有效套餐 → 系统默认 → 内置基础配置”选择。删除模板前需移除全部绑定；删除用户、订阅或套餐时，其关联绑定随之清除。

`admin:nodemgt.template.preview`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `subscription_id` | string | 必填，用于提供用户授权节点与外部链接的有效订阅 ID |
| `target` | string | 对应模板类型的客户端，如 `mihomo`、`surge-mac` |
| `template` | object | 本次预览的模板对象，包含 `name`、`kind`、`content`，可带 `id`，无需先保存 |

返回 `body`、`content_type`、`client`、`template_id` 和 `warnings`，使用与公开订阅相同的节点授权校验与生成流程。模板的格式、节点标记和使用步骤见[订阅模板](/plus/templates)。

## 下发状态与 Agent 扩展

`control.status` 返回 `node_uuid`、`operation_id`、`kind`、`status`、`last_error`、`created_at`、`updated_at`。页面状态使用 `saved`、`sent`、`applied`、`failed`；尚无记录时可能为 `not_started`。

Plus 的 Agent v2 通道额外使用 `nodemgt.control`、`nodemgt.controlResult`、`nodemgt.usage` 和 `nodemgt.presence`。它们由节点身份认证，分别承载配置、回执、流量和在线信息；不能当作管理员 RPC 方法调用，也不能假定普通 Lite-agent 实现了这些扩展。
