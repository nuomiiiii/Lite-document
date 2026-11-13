# 服务防护接口 <PlusBadge />

本页对应[服务防护](/plus/protection)，仅适用于 Lite-Plus。接口使用独立的 `admin:*Protection*` 方法，不属于 `admin:nodemgt.*` 命名空间。

## 认证与调用

所有接口均需要管理员登录会话并开启站点远程管理，API Key 不能调用。节点操作还受 Agent 能力及远程控制开关限制。

保存配置、安装启用、日志预览、解除封禁，以及联动组写操作需提交 `exec` 范围远程授权 `grant` 和页面标识 `page_id`。成功响应中的 `next_grant`、`expires_at` 用于后续授权轮换，不能重复使用已消耗的授权。

HTTP 响应沿用[通用响应格式](/development/api#http-响应)，下述结果位于 `data`；RPC2 通过 `POST /api/rpc2` 或 RPC2 WebSocket 调用，结果位于 `result`。

## 接口一览

表中 HTTP 路径统一以 `/api/admin` 为前缀。RPC2 调用时，将路径中的 `uuid` 或 `id` 放入 `params`。

| HTTP | RPC2 方法 | 参数与用途 |
| --- | --- | --- |
| `GET /protection/{uuid}` | `admin:getProtection` | 查询节点配置、环境、封禁与下发结果 |
| `POST /protection/{uuid}/precheck` | `admin:precheckProtection` | 运行环境预检查，参数 `uuid` |
| `POST /protection/{uuid}/upgrade` | `admin:upgradeProtection` | 参数 `uuid`、`grant`、`page_id`；按需安装 nftables 并启用独立防护表 |
| `PUT /protection/{uuid}` | `admin:saveProtection` | 参数 `uuid`、`config`、`grant`、`page_id`；保存完整配置并下发 |
| `POST /protection/{uuid}/preview` | `admin:previewProtection` | 参数 `uuid`、`source_id`、`path`、`format`、`grant`、`page_id`；预览日志解析结果 |
| `POST /protection/{uuid}/unban` | `admin:unbanProtection` | 参数 `uuid`、`ip`、可选 `group_id` / `local`、`grant`、`page_id`；解除封禁 |
| `GET /protection-groups` | `admin:listProtectionGroups` | 无参数，返回 `{groups:[...]}` |
| `POST /protection-groups` | `admin:saveProtectionGroup` | 参数 `name`、`members`、`grant`、`page_id`；编辑另带 `id` 和 `enabled` |
| `DELETE /protection-groups/{id}` | `admin:deleteProtectionGroup` | 参数 `id`、`grant`、`page_id`；停用、移除成员并删除组 |

联动组写操作可另带 `uuid`，返回该节点防护视图；省略时返回组列表。`members` 为完整节点 UUID 数组，只有支持服务防护且环境就绪的 Linux 节点会加入。

## 防护视图

<div class="plus-settings-table">

| 字段 | 含义 |
| --- | --- |
| `uuid`、`name` | 目标节点 |
| `config` | 当前完整防护配置 |
| `supported`、`linux` | Agent 是否支持服务防护、是否为 Linux |
| `unavailable` | 不可用原因，如 `agent_old`、`remote_off` |
| `capability` | nftables、权限、内核能力、就绪状态，以及 `missing`、`conflicts`、`manual_hints`、`planned_steps` 等检查详情 |
| `delivery_status`、`delivery_error` | 下发状态及错误 |
| `applied_revision` | 节点已应用的配置版本 |
| `upgrade` | 最近一次环境安装启用进度，阶段为 `precheck`、`install`、`enable`、`verify`、`ready` 或 `failed` |
| `bans`、`observe_hits` | 封禁记录与观察命中；无数据的可选字段可能省略 |
| `groups` | 联动组、当前节点是否为成员、成员列表及下发结果 |
| `source_stats`、`nflog` | 日志读取统计与网络观察报告，存在报告时返回 |
| `preview`、`preview_error` | 日志预览请求附带的解析结果及错误 |

</div>

环境检查的 `capability.runtime_ready` 和 `runtime_enabled` 用于判断防护是否就绪。配置保存成功后，还应检查下发结果及 `applied_revision`，不能仅凭 HTTP 成功判断主机已经应用。

## 配置字段

先读取节点的 `config`，保留完整来源、策略和运行状态后再保存。此接口会替换配置，不能只传本次修改的单个策略。

<div class="plus-settings-table">

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `enabled` | boolean | 服务防护总开关 |
| `runtime_enabled` | boolean | 防护运行状态；先通过环境安装启用流程准备，编辑时保留读取值 |
| `revision` | integer | 配置版本，由主控保存时维护 |
| `whitelist` | string[] | 单个 IPv4 / IPv6 地址，不接受 CIDR |
| `sources` | object[] | 日志来源数组 |
| `policies` | object[] | 服务防护策略数组 |

</div>

### 日志来源 `sources[]`

<div class="plus-settings-table">

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id` | string | 来源标识，编辑时保留 |
| `format` | string | `caddy_json`、`nginx_combined`、`nginx_json`、`sshd` |
| `path` | string | Linux 绝对路径；SSH 另支持 `journal:sshd` |
| `deploy_mode` | string | `direct` 或 `proxy`，默认 `direct`；SSH 仅支持 `direct` |
| `bind_protocol`、`bind_port` | string | 绑定协议及单端口；SSH 绑定 TCP 与实际 SSH 端口 |
| `bind_addr` | string | 可选，绑定的本地 IP |
| `host_filter` | string | 可选，站点过滤；SSH 不使用此字段 |

</div>

同一节点最多一条 SSH 来源。Nginx combined 必须指定绑定协议及单端口。限定本地地址的日志策略须指定来源，并确保来源能识别或绑定相同目标地址。

### 服务策略 `policies[]`

<div class="plus-settings-table">

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `id`、`name` | string | 策略标识及名称，编辑保留 `id` |
| `enabled` | boolean | 是否启用此策略 |
| `mode` | string | `observe` 仅观察、`enforce` 执行；默认 `observe` |
| `protocol`、`port` | string | 单条策略使用 `tcp` 或 `udp`，端口使用字符串；页面的 TCP/UDP 需拆成两条策略 |
| `bind_addr` | string | 可选，本地 IP；留空匹配对应端口 |
| `syn_rate`、`syn_burst`、`conn_limit` | integer | TCP SYN 每秒速率、突发量和并发连接上限 |
| `source_id` | string | 可选，明确指定日志来源；留空按服务绑定自动匹配 |
| `request_window_sec`、`request_threshold` | integer | 单 IP 的请求计数窗口与阈值；SSH 来源统计密码失败 |
| `paths` | string[] | 敏感路径，目录以 `/` 结尾 |
| `path_window_sec`、`path_threshold` | integer | 敏感路径计数窗口与阈值；SSH 不使用路径检测 |
| `ban_duration_sec` | integer | 默认 `600`，`-1` 表示永久封禁 |
| `group_id` | string | 可选，日志检测封禁所属联动组 |

</div>

阈值 `0` 关闭对应检测。`proxy` 来源只能观察；不能据此在本机封禁代理后的真实客户端 IP。TCP 超限执行丢弃，不创建 IP 封禁记录；日志执行封禁覆盖该来源全部入站连接。

## 解除封禁

本机解除提交 `ip` 和 `local:true`。联动记录提交对应 `group_id`，向组内同步解除；不能通过本机解除接口替代组内解除。两者都需要节点 `uuid`、`grant`、`page_id`。

封禁状态为 `active`、`expired`、`revoked`；原因包括 `path_scan`、`request_rate`、`ssh_auth` 和 `shared`。解除不会永久豁免该 IP，新违规仍可再次封禁。
