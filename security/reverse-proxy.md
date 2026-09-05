# 反向代理与 Tunnel

## Nginx 示例

假设 Lite 只在本机 `127.0.0.1:27777` 提供 HTTP：

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:27777;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
        client_max_body_size 50M;
    }

    location ^~ /api/rpc2 {
        proxy_pass http://127.0.0.1:27777;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
        client_max_body_size 50M;
    }
}
```

`/api/rpc2` 使用独立的代理配置，单独设置 WebSocket 转发、3600 秒读写超时和关闭缓冲，便于维护 RPC 长连接。`location /` 负责其他页面与接口，并保留 Agent、远程终端和实时状态所需的 WebSocket 设置。

两个 `location` 都需要各自配置转发头，不能依赖另一个配置段。请保留请求原有的 `Origin`，不要在代理中改成固定站点地址，以免掩盖来源校验错误。普通请求（包括 `HEAD`）也应交给 Lite 处理。

备份恢复和主题上传会按约 5 MiB 分段传输。`client_max_body_size` 需要覆盖单个分段，不必按完整备份包体积放大。下载完整备份仍受代理读取超时和最大响应限制影响。

## Docker + 本机反代

容器端口可只绑定回环地址：

```yaml
ports:
  - "127.0.0.1:27777:27777"
```

Nginx 位于宿主机时反代 `127.0.0.1:27777`。Nginx 位于另一个容器时，不能使用它自己的 `127.0.0.1`，应使用 Docker 网络中的 `lite` 服务名和容器端口。

## Cloudflare Tunnel

Cloudflare Tunnel 管理位于“反向代理”下的独立页签。可在后台保存 Tunnel Token 并启动 `cloudflared`。Token 在服务端加密保存，前端只读取“是否已保存”，不会取回明文。

非 Docker 部署需自行安装 `cloudflared`，或通过 `LITE_CLOUDFLARED_BIN` 指定路径。Docker 环境需确保镜像中包含可执行文件或另行运行 cloudflared 容器。

如果正在通过该 Tunnel 访问后台，停止 Tunnel 会立即断开当前页面，因此停止操作需要额外确认。

## Cloudflare Access

为 Web 页面启用 Access 后，浏览器与 Agent 需要分别满足各自的访问策略。Lite `2.3.2` 使用以下连接路径：

| 用途 | 路径 | Access 配置 |
| --- | --- | --- |
| 浏览器远程终端与文件 | `/api/admin/client/remote` 及其子路径 | 允许已通过 Access 登录的浏览器访问，并支持 WebSocket |
| Agent 上报与任务 | `/api/clients/v2/rpc` | 使用 Service Auth，允许 Agent 的 Service Token |
| Agent 远程连接 | `/api/clients/remote` | 使用与 Agent 上报相同的 Service Auth 凭据 |
| Agent 首次自动发现 | `/api/clients/register` | 使用自动发现时也需要允许 Service Auth |
| 公开大屏实时状态与 RPC | `/api/clients`、`/api/rpc2` | 按该站点面向访客或登录用户的访问策略配置 |

Agent 中需同时配置 Client ID 和 Client Secret，见 [Agent 的 Cloudflare Access 配置](/remote/agent#cloudflare-access)。浏览器终端应沿用正常的 Access 登录策略，不需要为了排查而把整段管理接口设为 Bypass；Lite 自身的登录、重新验证和远程权限检查仍然生效。

::: warning 不要只放行首页
只允许 `/` 和静态资源时，页面可能正常显示，但 API 或 WebSocket 仍会被拦截。`/api/clients` 是实时状态入口，仅放行它不能解决浏览器终端 `/api/admin/client/remote` 或 Agent `/api/clients/remote` 的 `403`。
:::

## 常见错误

- `502`：代理无法连接 Lite，常见于端口写错或容器网络地址错误。
- `403 WebSocket`：Origin、登录会话或 Cloudflare Access 拒绝连接。
- 页面一直加载：HTML 可以访问，但静态资源、API 或 WebSocket 被缓存或拦截。
- HTTPS 页面跳回 HTTP：代理没有正确传递 `X-Forwarded-Proto`，或该请求来自不受信任的代理地址。
