# 入站与协议 <PlusBadge />

本页仅适用于 Lite-Plus。“入站”是客户端连接到节点的代理入口，位置为“节点管理 → 入站”。先在“服务器”中接入 Lite-Plus-agent，再创建入站。

## 新建入站

1. 点击“新建”，填写名称并选择服务器。
2. 选择协议、内核、地址栈、监听地址和端口。
3. 在传输与安全配置中填写 TLS 或 Reality 等参数；使用 TLS 时选择该节点可用的证书。
4. 设置分享地址和订阅排序，保存并检查“下发”列。
5. 在“用户”中把该入站授权给需要使用的节点用户，再预览订阅。

## 基本字段

| 字段 | 填写方式 |
| --- | --- |
| 名称 | 便于识别的入口名称，会用于列表和订阅节点 |
| 服务器 | 选择已接入 Plus Agent 的节点 |
| 协议 | VLESS、VMess、Trojan、Shadowsocks、Hysteria2、TUIC、AnyTLS |
| 内核 | Hysteria2、TUIC、AnyTLS 使用 sing-box；其余默认 Xray，可按页面可选项调整 |
| 地址栈 | 新建默认“仅 IPv4”，也可选“仅 IPv6”或“双栈” |
| 监听地址 | 留空跟随地址栈；填写具体 IP 时只绑定该地址 |
| 端口 | 节点实际监听的端口，可使用随机端口按钮；需与节点其他服务错开 |
| 启用 | 关闭后该入站不再作为启用配置下发 |
| 订阅排序 | 数字越小越靠前，也可用列表的上下箭头调整 |

监听留空时，仅 IPv4 使用 `0.0.0.0`，仅 IPv6 使用 `::`，双栈同时监听两者。客户端还需能够到达该端口；Hysteria2 / TUIC 使用 QUIC，需放行对应 UDP 端口。

## 传输与安全

| 协议 | 页面提供的传输 | 安全配置 |
| --- | --- | --- |
| VLESS / VMess | TCP、WebSocket、gRPC、HTTPUpgrade、XHTTP | 随传输和内核选择页面可用组合 |
| Trojan | TCP、WebSocket、gRPC、HTTPUpgrade、XHTTP | TLS |
| Shadowsocks | TCP | 加密方法，无额外 TLS |
| Hysteria2 / TUIC | QUIC | TLS |
| AnyTLS | TCP | TLS 或 Reality，使用 sing-box |

不同内核支持的组合以节点应用结果为准。客户端也必须支持所选协议、传输和安全方式。

常用参数如下：

| 配置 | 字段与用途 |
| --- | --- |
| TLS | 绑定同节点证书，按需填写 SNI、ALPN 和客户端指纹 |
| Reality | 填写目标站点、服务器名称（SNI）和 Short ID；保存时可自动生成密钥，Short ID 可随机生成 |
| VLESS Flow | Xray 的 VLESS + TCP + TLS/Reality 可设置 Vision；用户可单独覆盖默认 Flow |
| WebSocket | 路径和 Host；经反向代理时与回源配置保持一致 |
| gRPC | `serviceName` 与 `multiMode` |
| XHTTP / HTTPUpgrade | 路径、Host；XHTTP 还可选择模式 |
| TCP 伪装 | 可选 HTTP 伪装及对应 Host |
| Shadowsocks | 选择加密方法，并使用订阅生成的用户凭据 |

Reality 不使用节点 TLS 证书。目标站点需支持 TLS 1.3 与 HTTP/2，SNI 应与目标证书匹配；不要把它填写成面板证书路径。

## 分享地址

分享地址用于生成客户端订阅，与节点实际监听地址分开设置。

| 选项 | 行为 |
| --- | --- |
| 节点地址 | 优先使用该节点可用的已签发证书域名，没有域名时使用节点公网 IP |
| 入站监听地址 | 使用填写的监听地址；通配监听地址不能直接作为客户端目标 |
| 其他 | 手工填写客户端可达的域名或 IP，适合 CDN、转发或不同公开地址 |
| 不分享 | 不把这个入站放入用户订阅，不等同于停用入站 |

选择“其他”时必须填写地址。若预览订阅为空，检查用户是否获授权、入站是否启用，以及分享地址是否可用。

## 流量探测与路由

“流量探测”默认关闭。需要根据 HTTP、TLS 或 QUIC 嗅探结果分流时，在“嗅探”中开启并选择探测类型。匹配探测协议的路由规则也依赖此设置。

“仅用于路由”表示只使用嗅探结果选路，不修改实际连接目标。Reality 或 Vision 下会强制启用该选项。具体规则见[出站与路由](/plus/forwarding)。
