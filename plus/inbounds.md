# 入站与协议 <PlusBadge />

本页仅适用于 Lite-Plus。“入站”是客户端连接到节点的代理入口，位置为“节点管理 → 入站”。先在“服务器”中接入 Lite-Plus-agent，再创建入站。

## 新建入站

1. 点击“新建”，填写名称并选择服务器。
2. 选择协议、内核、地址栈、监听地址和端口。
3. 在传输与安全配置中填写 TLS 或 Reality 等参数；使用 TLS 时选择该节点可用的证书。
4. 设置分享地址和订阅排序；需要联动主机防火墙时勾选“同时放行该端口”，保存并检查“下发”列。
5. 在“用户”中把该入站授权给需要使用的节点用户，再预览订阅。

## 基本字段

<div class="plus-settings-table">

| 字段 | 填写方式 |
| --- | --- |
| 名称 | 便于识别的入口名称，会用于列表和订阅节点 |
| 服务器 | 选择已接入 Plus Agent 的节点 |
| 协议 | VLESS、VMess、Trojan、Shadowsocks、Hysteria2、TUIC、AnyTLS、HTTP |
| 内核 | Hysteria2、TUIC、AnyTLS 使用 sing-box；其余默认 Xray，可按页面可选项调整 |
| 地址栈 | 新建默认“仅 IPv4”，也可选“仅 IPv6”或“双栈” |
| 监听地址 | 留空跟随地址栈；填写具体 IP 时只绑定该地址 |
| 端口 | 填写 `1–65535` 的整数，可使用随机端口按钮；填 `0` 不会随机分配，需与节点其他服务错开 |
| 启用 | 关闭后该入站不再作为启用配置下发 |
| 订阅排序 | 新建留空追加到全部入站末尾；数字越小越靠前，`0` 是有效排序值；也可用列表的上下箭头调整 |
| 同时放行该端口 | 按入站的地址栈、端口与协议创建主机防火墙放行规则，需开启远程控制并完成验证 |

</div>

监听留空时，仅 IPv4 使用 `0.0.0.0`，仅 IPv6 使用 `::`，双栈同时监听两者。客户端还需能够到达该端口；Hysteria2 / TUIC 使用 QUIC，需放行对应 UDP 端口。

## 传输与安全

<div class="plus-settings-table">

| 协议 | 页面提供的传输 | 安全配置 |
| --- | --- | --- |
| VLESS / VMess | TCP、WebSocket、gRPC、HTTPUpgrade、XHTTP | 随传输和内核选择页面可用组合 |
| Trojan | TCP、WebSocket、gRPC、HTTPUpgrade、XHTTP | TLS |
| Shadowsocks | TCP 与 UDP、仅 TCP、仅 UDP | 加密方法，无额外 TLS |
| Hysteria2 / TUIC | QUIC | TLS |
| AnyTLS | TCP | TLS 或 Reality，使用 sing-box |
| HTTP | TCP | 无额外加密或 TLS；使用 TLS 时绑定同节点证书 |

</div>

不同内核支持的组合以节点应用结果为准。客户端也必须支持所选协议、传输和安全方式。

常用参数如下：

<div class="plus-settings-table">

| 配置 | 字段与用途 |
| --- | --- |
| TLS | 绑定同节点证书，按需填写 SNI、ALPN 和客户端指纹 |
| Reality | 填写目标站点、服务器名称（SNI）和 Short ID；保存时可自动生成密钥，Short ID 可随机生成 |
| VLESS Flow | Xray 与 sing-box 的 VLESS + TCP + TLS/Reality 均可设置 Vision；用户非空 Flow 覆盖入站默认值 |
| WebSocket | 路径和 Host；经反向代理时与回源配置保持一致 |
| gRPC | `serviceName` 与 `multiMode` |
| XHTTP / HTTPUpgrade | 路径、Host；XHTTP 还可选择模式 |
| TCP 伪装 | 可选 HTTP 伪装及对应 Host |
| Shadowsocks | 选择网络和加密方法，并使用订阅生成的用户凭据 |
| UDP 分片 | 仅 sing-box 中实际监听 UDP 的入站提供，默认关闭；需要发送超过 MTU 的 UDP 包时可开启 |

</div>

Reality 不使用节点 TLS 证书。新建时默认目标为 `addons.mozilla.org:443`，SNI 为 `addons.mozilla.org`，也可按节点网络改用其他目标。目标站点需支持 TLS 1.3 与 HTTP/2，SNI 应与目标证书匹配；保存后确认节点能够访问目标站点。

从 TLS 切换为 Reality 后，分享链接中的 SNI 使用 Reality 的服务器名称。保存并确认节点已应用后，更新客户端订阅，核对目标与 SNI。

### VLESS Vision

在 VLESS 入站中选择 TCP，并使用 TLS 或 Reality 后，可设置 Flow。Reality 默认使用 `xtls-rprx-vision`；TLS 可按客户端需要选择，留空表示不设置入站默认 Flow。

<div class="plus-settings-table">

| 内核 | 可选 Flow |
| --- | --- |
| Xray | 留空、`xtls-rprx-vision`、`xtls-rprx-vision-udp443` |
| sing-box | 留空、`xtls-rprx-vision` |

</div>

用户的 Flow 非空时优先使用用户设置，否则沿用入站默认值，订阅携带最终 Flow。切换到 sing-box 时，带 Vision 的 `udp443` 形式会转换为 `xtls-rprx-vision`。WebSocket、其他非 TCP 传输或明文入站不使用 Flow。

sing-box Vision 需要配套 Plus Agent `0.0.1.4` 及以上。同时更新服务端、后台和 Agent，保存并等待“已生效”后，再让客户端更新订阅。

## HTTP 账号与透明转发

新建入站选择“HTTP”后，在“账户”中填写用户名和密码，可添加多组账户。新建时会自动生成一组，也可自行修改；保存后检查“下发”状态，并在客户端填写相同的连接地址、端口和账号密码。

“允许透明”默认关闭。有透明转发需求时按实际内核和客户端配置开启，普通账号代理保持关闭。HTTP 入站使用 TCP，可选择 TLS；它与 WebSocket、XHTTP 等传输方式中的 HTTP 参数分别配置。

入站手工配置的账户与“节点管理 → 用户”中的节点用户分别管理。需要套餐、期限和用户订阅时，仍应创建节点用户、授权该入站，并使用该用户“预览订阅”中的连接凭据。

## Shadowsocks 加密与凭据

Shadowsocks 默认使用 `2022-blake3-aes-128-gcm`，也可在表单中选择其他可用方法。SS2022 连接需要匹配服务器密钥和用户密钥，客户端应从生成的订阅或分享链接导入完整密码，避免只填写节点用户的 UUID。

网络默认“TCP, UDP”，也可按用途选择仅 TCP 或仅 UDP。这项设置控制代理监听的网络协议；选择 UDP 后，还需放行对应 UDP 端口。使用 sing-box 时，可按需开启“UDP 分片”；Xray 不提供此项。

切换加密方法后，重新保存并确认节点已经应用，再更新客户端订阅；从入站导入出站时，也应核对方法和完整密码，见[出站与路由](/plus/forwarding#从已有配置导入)。

## 联动放行端口

勾选“同时放行该端口”后，Plus 会按入站地址栈和协议创建主机防火墙放行规则。双栈同时处理 IPv4 与 IPv6；Shadowsocks 跟随所选网络，Hysteria2 / TUIC 放行 UDP。

先开启站点远程管理与 Agent 远程控制，保存时按提示完成密码、2FA 或通行密钥验证。修改关联端口、协议或地址栈会更新规则；停用入站会同步停用联动规则，取消联动或删除入站会移除对应规则。

在入站“下发”列确认配置生效后，再到“远程管理 → 防火墙”检查规则是否已应用。云安全组和端口映射需要按实际环境另外配置，完整操作见[服务器防火墙](/plus/firewall)。

## 停用与删除

停用入站后，该入口停止作为启用配置下发，也不再出现在用户订阅中。删除入站会清理该入站及用户对它的授权关系，保留节点用户、套餐分配、连接凭据和订阅；用户没有其他可分享入站时，订阅中也就没有这些节点。

删除整个服务器的清理范围不同，见[服务器管理](/admin/servers#操作按钮)。

## 分享地址

分享地址用于生成客户端订阅，与节点实际监听地址分开设置。

| 选项 | 行为 |
| --- | --- |
| 节点地址 | 优先使用该节点可用证书的分享域名；根证书下发使用为节点填写的子域名，没有可用域名时使用节点公网 IP |
| 入站监听地址 | 使用填写的监听地址；通配监听地址不能直接作为客户端目标 |
| 其他 | 手工填写客户端可达的域名或 IP，适合 CDN、转发或不同公开地址 |
| 不分享 | 不把这个入站放入用户订阅，不等同于停用入站 |

选择“其他”时必须填写地址。若预览订阅为空，检查用户是否获授权、入站是否启用，以及分享地址是否可用。

使用“节点地址”且没有可用证书域名时，公网 IP 按入站地址栈选择：仅 IPv4 优先 IPv4，仅 IPv6 或双栈优先 IPv6；优先地址缺失时再使用另一地址。客户端需具备相应的网络连通性。

## 流量探测与路由

“流量探测”默认关闭。需要根据 HTTP、TLS 或 QUIC 嗅探结果分流时，在“嗅探”中开启并选择探测类型。匹配探测协议的路由规则也依赖此设置。

“仅用于路由”表示只使用嗅探结果选路，不修改实际连接目标。Reality 或 Vision 下会强制启用该选项。具体规则见[出站与路由](/plus/forwarding)。
