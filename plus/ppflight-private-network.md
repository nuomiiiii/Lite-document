---
title: PPFlight 内网中转落地
description: 使用 Lite-Plus 配置 PPFlight 精品优化机与 Global 之间的内网中转，包含 VLESS + TLS、Shadowsocks、路由、用户授权与连接验证。
---

# PPFlight 内网中转落地 <PlusBadge />

客户端连接精品优化机，优化机通过 PPFlight 的“私有网络”将流量转发到 Global 落地机，再由 Global 访问目标网站。

以下以 Lite-Plus 的“节点管理”为例。私网段可选择 **VLESS + TLS** 或 **Shadowsocks（SS）**，任选一种即可；优化机面向客户端的公网入站可使用 **VLESS + Reality**。3x-ui 等面板的大致思路同理。

## 流量如何经过两台服务器

<div class="private-relay-flow" role="img" aria-label="客户端通过精品公网线路连接优化机，优化机通过 PPFlight 私网连接 Global，Global 通过公网连接目标网站，响应按原路径返回。">
  <div class="private-relay-flow__node"><strong>客户端</strong><span>电脑或手机</span></div>
  <div class="private-relay-flow__link"><span aria-hidden="true">⇄</span><small>精品公网线路</small></div>
  <div class="private-relay-flow__node"><strong>精品优化机</strong><span>入口 / 中转</span></div>
  <div class="private-relay-flow__link private-relay-flow__link--private"><span aria-hidden="true">⇄</span><small>PPFlight 私网</small></div>
  <div class="private-relay-flow__node"><strong>Global</strong><span>落地 / 出口</span></div>
  <div class="private-relay-flow__link"><span aria-hidden="true">⇄</span><small>Global 公网</small></div>
  <div class="private-relay-flow__node"><strong>目标网站</strong><span>实际访问服务</span></div>
</div>

PPFlight 私网流量不计入公网套餐额度。因此，优化机与 Global 之间的转发使用私网流量，访问目标网站的公网流量由 Global 承担，减少精品套餐的流量消耗。这通常被称为“**理论单向计费**”。

客户端与优化机之间仍经过公网，并按精品套餐的计费规则统计；Global 与目标网站之间的流量也按 Global 套餐计算。

## 一、将两台服务器接入同一私网

在 PPFlight 控制台打开“私有网络”，创建私网，并通过“接入私网”加入精品优化机和 Global。两台服务器需要属于**同一账户、同一可用区、同一个私网**。

加入后，服务器会增加私有网卡，同一私网内通过各自的私网 IP 通信。按控制台提示完成接入，并记录两台服务器的私网 IP。

<div class="plus-settings-table">

| 项目 | PPFlight 私网规则 |
| --- | --- |
| 网络隔离 | 不同账户、不同私网之间相互隔离 |
| 单台 VPS 带宽 | 私网发送、接收各限 `500 Mbps` |
| 跨机共享带宽 | 按宿主机共享，发送、接收各 `2 Gbps` |
| 流量计费 | 私网流量不计入公网套餐额度 |

</div>

`500 Mbps` 是带宽上限，不是 500 MB/s，也不是保证独享的实际速度；跨机还受宿主机共享带宽影响。私网规则以 PPFlight 控制台及实际套餐说明为准。

[![PPFlight 私有网络页面，可查看可用区、私网网段、成员服务器和私网带宽。](/assets/tutorials/ppflight/private-network.png)](/assets/tutorials/ppflight/private-network.png)

下面使用这些**示例值**，操作时替换为你自己的服务器和地址：

<div class="plus-settings-table">

| 用途 | 优化机 | Global |
| --- | --- | --- |
| 服务器名称 | `LAX_CN2` | `LAX_GLOBAL` |
| 私网 IP | `10.240.3.10` | `10.240.3.20` |
| 客户端公网入口 | 优化机公网 IP 或域名，端口 `443` | 不作为客户端入口 |
| 私网代理端口 | 无需另外创建私网入站 | VLESS + TLS 用 `24443`，或 SS 用 `24444` |
| TLS 证书域名 | 公网 Reality 入站无需本机 TLS 证书 | VLESS + TLS 示例为 `relay.example.com`；SS 不需要证书 |

</div>

## 二、在 Global 创建私网入站

进入“节点管理 → 入站”，点击“新建”，**服务器选择 Global**。以下两种方案任选一种，两端的协议、端口和安全参数必须对应。

### 方案 A：VLESS + TLS

先在“节点管理 → 证书”给 Global 配置一张可用的域名证书，例如 `relay.example.com`。可以使用主控申请、根证书下发或节点已有文件，具体操作见[节点证书](/plus/certificates)。然后创建入站：

<div class="plus-settings-table relay-config-table">

| 位置 | 字段 | 示例设置 |
| --- | --- | --- |
| 基础配置 | 备注 / 名称 | `Global 私网 VLESS` |
| 基础配置 | 服务器 | `LAX_GLOBAL` |
| 基础配置 | 协议 / 内核 | `VLESS` / `Xray` |
| 基础配置 | 地址栈 | 仅 IPv4 |
| 基础配置 | 监听 | Global 落地机的内网 IP：`10.240.3.20` |
| 基础配置 | 端口 | `24443` |
| 基础配置 | 分享地址 | 选择“入站监听地址” |
| 基础配置 | 同时放行该端口 | 保持关闭，按下文单独限制来源 |
| 传输 | 传输方式 | `TCP` |
| 安全 | 安全方式 / 证书 | `TLS` / Global 对应的域名证书 |
| 安全 | Flow | 无 |
| 基础配置 | 启用 | 开启 |

</div>

出站连接时，**地址使用 Global 私网 IP，SNI 使用证书域名**。例如连接 `10.240.3.20:24443`，SNI 填写 `relay.example.com`，两者用途不同。TLS 证书应受信任且覆盖所填 SNI，无需为了证书校验把转发地址改成公网 IP，也不要通过跳过证书验证解决域名不匹配。

### 方案 B：Shadowsocks

不想为私网代理配置域名证书时，可以使用 SS。示例使用面板默认的 SS2022 方法：

<div class="plus-settings-table relay-config-table">

| 位置 | 字段 | 示例设置 |
| --- | --- | --- |
| 基础配置 | 备注 / 名称 | `Global 私网 SS` |
| 基础配置 | 服务器 | `LAX_GLOBAL` |
| 基础配置 | 协议 / 内核 | `Shadowsocks` / `Xray` |
| 基础配置 | 地址栈 | 仅 IPv4 |
| 基础配置 | 监听 | Global 落地机的内网 IP：`10.240.3.20` |
| 基础配置 | 端口 | `24444` |
| 基础配置 | 分享地址 | 选择“入站监听地址” |
| 基础配置 | 同时放行该端口 | 保持关闭，按下文单独限制来源 |
| 传输 | 网络 | TCP 与 UDP |
| 传输 | 加密方法 | `2022-blake3-aes-128-gcm` |
| 基础配置 | 启用 | 开启 |

</div>

SS 使用自身的加密，不需要额外配置 TLS 或 Reality。后续优先通过“从入站导入”生成匹配的出站；使用 SS2022 时需要完整的服务器密钥与用户密钥组合，不能把用户 UUID 直接当作连接密码。

[![新建入站表单。服务器、监听、分享地址和端口位于基础配置，传输与安全参数在对应页签中填写。](/assets/tutorials/ppflight/inbound.png)](/assets/tutorials/ppflight/inbound.png)

两种方案的“监听”均填写 Global 落地机的内网 IP，“分享地址”选择“入站监听地址”，这样从入站导入出站时就会使用该内网地址。截图用于说明表单位置，填写值以所选方案的表格为准。保存后，检查 Global 的“下发”状态是否为“已生效”。

### 为私网入站放行端口

Global 的入站只监听它的私网 IP，并在主机防火墙中仅允许优化机的私网来源访问：

<div class="plus-settings-table">

| 所选方案 | Global 放行端口 | 来源 |
| --- | --- | --- |
| VLESS + TLS | TCP `24443` | `10.240.3.10/32` |
| SS | TCP 与 UDP `24444` | `10.240.3.10/32` |

</div>

若多台优化机共用 Global，分别添加它们的私网来源。已有全来源放行规则时，应同时调整或收紧，确认最终生效的规则确实限制了来源；仅添加一条更窄的放行规则不会撤销已有放行。操作方式见[服务器防火墙](/plus/firewall)。服务商防火墙等其他规则也需允许这段私网连接。

### 创建 Global 中转专用用户

进入“节点管理 → 用户”新建用户，例如 `relay-global`：

1. 开启用户，Flow 选择“无”；示例可不分配套餐，限速和在线 IP 上限均设为 `0`。
2. 在“入站”页签中，**只授权刚才创建的 Global 私网入站**。
3. 保存，并立即复制弹出的明文凭据。VLESS 出站使用此用户的 UUID；SS 出站优先从入站导入完整密码。

这名用户用于优化机连接 Global。后面另建客户端用户，并只授权优化机的公网入站，分别使用两组凭据。

[![新建用户的基础配置，可设置用户名、Flow、限速、在线 IP 上限和启用状态。](/assets/tutorials/ppflight/user.png)](/assets/tutorials/ppflight/user.png)

[![新建用户的入站页签，用于选择该用户可以连接的入站。](/assets/tutorials/ppflight/user-inbounds.png)](/assets/tutorials/ppflight/user-inbounds.png)

## 三、在优化机创建公网入站

继续在“节点管理 → 入站”新建入口，这次**服务器选择优化机**，例如 `LAX_CN2`。

<div class="plus-settings-table">

| 字段 | 示例设置 |
| --- | --- |
| 备注 / 名称 | `精品入口` |
| 服务器 | `LAX_CN2` |
| 协议 / 内核 | `VLESS` / `Xray` |
| 地址栈与监听 | 选择客户端可达的公网地址栈；监听留空时跟随地址栈 |
| 端口 | `443`，确保未被其他服务占用 |
| 传输 / 安全 | `TCP` / `Reality` |
| Reality 参数 | 按[入站与协议](/plus/inbounds#传输与安全)填写目标站点、SNI、密钥与 Short ID |
| Flow | 可使用 `xtls-rprx-vision`，与客户端保持一致 |
| 分享地址 | 使用客户端可达的优化机公网 IP 或域名 |
| 启用 | 开启，并放行公网 TCP `443` |

</div>

已有可用的优化机公网入站时，可沿用现有入口。公网客户端不会直接连接 Global 的私网 IP。

## 四、在优化机创建指向 Global 的出站

进入“节点管理 → 出站”，点击“新建”。

### 优先从 Global 入站导入

1. 在“从入站导入”中选择刚创建的 Global 私网入站，自动带入协议、传输、安全与用户凭据。
2. **服务器选择优化机 `LAX_CN2`**。这里表示“由哪台服务器发起连接”，不是目标 Global。
3. 出站标签填写 `to-global-private`。
4. **确认“地址”为 Global 的内网 IP `10.240.3.20`**，端口为实际私网入站端口。按前面的“监听”和“分享地址”设置导入后，地址应为这个内网 IP。
5. 对照下面表格检查参数，保存并等待优化机“已生效”。

<div class="plus-settings-table">

| 字段 | VLESS + TLS 方案 | SS 方案 |
| --- | --- | --- |
| 服务器 | 优化机 `LAX_CN2` | 优化机 `LAX_CN2` |
| 出站标签 | `to-global-private` | `to-global-private` |
| 协议 / 内核 | `VLESS` / `Xray` | `Shadowsocks` / `Xray` |
| 地址 | `10.240.3.20` | `10.240.3.20` |
| 目标端口 | `24443` | `24444` |
| 凭据 | `relay-global` 的 UUID | 从 Global 入站导入的完整密码 |
| Flow | 无 | 无此项 |
| 传输 / 网络 | TCP | TCP 与 UDP |
| 安全配置 | TLS，SNI 为证书覆盖的域名，如 `relay.example.com` | SS 自身加密，无额外 TLS |
| 加密方法 | 无此项 | 与 Global 一致，如 `2022-blake3-aes-128-gcm` |
| 前置出站 | 无 | 无 |
| 启用 | 开启 | 开启 |

</div>

Global 的私网入站只授权给中转专用用户，普通客户端用户仅授权优化机的公网入站。导入后核对实际地址、端口和凭据。

### 手动填写或粘贴分享链接

也可以保持“手动填写”，按上表输入，或粘贴已有的 Global 分享链接再修改地址。VLESS 的 UUID 必须来自已授权 Global 入站的用户；SS 的方法和完整密码必须与 Global 匹配，SS2022 尤其要保留完整的密钥组合。

[![新建出站表单，可从入站导入、粘贴分享链接，或手动填写服务器、标签、目标地址、端口和凭据。](/assets/tutorials/ppflight/outbound.png)](/assets/tutorials/ppflight/outbound.png)

## 五、用路由把优化机入口交给 Global

**创建出站不会自动让流量使用它，还需要创建路由**。进入“节点管理 → 路由”，新建规则：

<div class="plus-settings-table relay-config-table">

| 页签 | 字段 | 示例设置 |
| --- | --- | --- |
| 目标 | 服务器 | 优化机 `LAX_CN2` |
| 目标 | 名称 | `精品入口走 Global 私网` |
| 目标 | 入站 | 选择优化机的 `精品入口` |
| 目标 | 出站 | 选择 `to-global-private` |
| 目标 | 启用 | 开启 |
| 匹配 | 域名 | 留空，不额外限制 |
| 匹配 | IP | 留空，不额外限制 |
| 匹配 | 目标端口 | 留空，不额外限制 |
| 匹配 | 来源 IP | 留空，不额外限制 |
| 匹配 | 探测协议 | 不限 |
| 匹配 | 网络 | TCP 与 UDP |
| 匹配 | 优先级 | 例如 `100`；按现有规则调整，数字越小越先匹配 |

</div>

路由“匹配”中的 IP 指访问目标的 IP，**不是 Global 的私网 IP**；Global 的私网 IP 已填在出站中。这里限定了优化机的指定入站，所以该入口的流量会交给 Global。

规则从上到下先匹配的生效。已有直连或其他代理规则时，核对顺序，避免流量先命中其他出口；需要保留的阻断或例外规则可排在这条规则之前。Global 保持默认直连出口，并核对没有将这条私网入站再转回优化机的规则。

[![新建路由的目标页签，选择优化机、对应入站和私网出站；匹配条件在另一个页签中设置。](/assets/tutorials/ppflight/route.png)](/assets/tutorials/ppflight/route.png)

保存后，等待优化机路由“已生效”。两台服务器的分工应为：**优化机：公网入站 → 私网出站；Global：私网入站 → 默认直连 → 目标网站。**

## 六、创建客户端用户并验证

在“节点管理 → 用户”创建实际使用的客户端用户：

1. 在“入站”页签中，只勾选优化机的 `精品入口`，按需设置套餐、期限、限速和在线 IP 上限。
2. VLESS + Reality 入口的用户 Flow 与入站及客户端保持一致；使用 Vision 时可沿用入站默认值，或设置匹配的用户 Flow。
3. 等待下发“已生效”，通过“预览订阅”或用户订阅地址导入客户端。订阅入口的设置见[订阅与外部链接](/plus/subscriptions)。
4. 在客户端确认节点地址是**优化机的公网地址**，连接该节点。

普通用户不需要授权 Global 私网入站，也不需要导入中转专用用户的订阅。Global 专用用户被停用、到期或额度耗尽时，使用它的中转连接也会受到影响。

### 检查出口 IP

连接优化机节点后，让浏览器通过该节点访问 [IPLark](https://iplark.com/)，查看当前出口 IP。显示为 **Global 的公网 IP**，即可确认流量已通过 Global 落地。

如需对优化机或 Global 落地机进行 TCP 调优，见 [TCP 调优](/guide/tcp-tuning)。

## 常见问题

<div class="plus-settings-table">

| 现象 | 优先检查 |
| --- | --- |
| 私网 IP 无法连接 | 两台服务器是否属于同一账户、具体可用区和同一个私网，私有网卡与地址是否已配置 |
| Global 端口不可达 | 入站是否已生效，监听是否为 Global 私网 IP，主机及服务商防火墙是否允许优化机私网来源 |
| VLESS + TLS 握手失败 | UUID 是否属于 Global 已授权用户，SNI 是否被证书覆盖，证书是否有效且已下发，两端 Flow 是否均为“无” |
| SS 无法连接 | 方法、网络和完整密码是否一致；SS2022 是否漏掉服务器密钥或用户密钥 |
| 能连接但出口仍是优化机 | 出站是否建在优化机、路由是否选择正确入站与出站、是否先命中直连规则、客户端查询请求是否经过代理 |
| 导入后仍消耗两机公网流量 | 出站地址是否仍为 Global 公网 IP 或解析到公网的域名；改为实际私网 IP，并重新连接验证 |
| Global 私网节点出现在普通用户订阅 | 检查普通用户是否误获该入站授权；Global 私网入站只授权给中转专用用户 |

</div>
