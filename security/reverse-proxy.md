# 反向代理与 Tunnel

## Nginx 示例

假设 Komari Lite 只在本机 `127.0.0.1:25774` 提供 HTTP：

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        if ($request_method = HEAD) {
            return 204;
        }

        proxy_pass http://127.0.0.1:25774;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        client_max_body_size 50M;
    }

    location ^~ /api/rpc2 {
        proxy_pass http://127.0.0.1:25774;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header Origin $scheme://$http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
}
```

`/api/rpc2` 使用独立的长连接超时和 Origin，避免 Agent 状态连接被普通页面的代理策略提前断开。WebSocket 设置还会影响远程终端、实时状态和部分主题；页面能打开不代表这些连接一定可用。

备份恢复和主题上传会按约 5 MiB 分段传输。`client_max_body_size` 需要覆盖单个分段，不必按完整备份包体积放大。下载完整备份仍受代理读取超时和最大响应限制影响。

## Docker + 本机反代

容器端口可只绑定回环地址：

```yaml
ports:
  - "127.0.0.1:25774:25774"
```

Nginx 位于宿主机时反代 `127.0.0.1:25774`。Nginx 位于另一个容器时，不能使用它自己的 `127.0.0.1`，应使用 Docker 网络中的 Komari Lite 服务名和容器端口。

## Cloudflare Tunnel

<div class="version-note"><strong>2.1.12</strong><span>Cloudflare Tunnel 管理已纳入 2.1.12 正式版，并位于“反向代理”下的独立页签。</span></div>

可在后台保存 Tunnel Token 并启动 `cloudflared`。Token 在服务端加密保存，前端只读取“是否已保存”，不会取回明文。

非 Docker 部署需自行安装 `cloudflared`，或通过 `KOMARI_CLOUDFLARED_BIN` 指定路径。Docker 环境需确保镜像中包含可执行文件或另行运行 cloudflared 容器。

如果正在通过该 Tunnel 访问后台，停止 Tunnel 会立即断开当前页面，因此停止操作需要额外确认。

## Cloudflare Access

为 Web 页面启用 Access 后，远程终端使用的 WebSocket 也可能被拦截。需要使用远程终端时，必须在 Cloudflare Tunnel / Access 规则中放通同一域名下的 `/api/clients`。

可为面板域名的 `/api/clients` 建立单独的 Bypass 规则。Agent 的其他接口不需要因此全部公开；如果 Agent 也经过 Cloudflare Access，应使用 Service Auth，并在 Agent 中同时配置对应的 Client ID 和 Client Secret。放通 `/api/clients` 不等于取消 Komari Lite 权限校验，管理员登录、2FA、会话和节点权限仍由 Komari Lite 验证。

::: warning 不要只放行首页
只允许 `/` 和静态资源时，公共页面可能正常显示，但远程终端会在 `/api/clients` 的 WebSocket 握手阶段返回 `403`。
:::

## 常见错误

- `502`：代理无法连接 Komari Lite，常见于端口写错或容器网络地址错误。
- `403 WebSocket`：Origin、登录会话或 Cloudflare Access 拒绝连接。
- 页面一直加载：HTML 可以访问，但静态资源、API 或 WebSocket 被缓存或拦截。
- HTTPS 页面跳回 HTTP：代理没有正确传递 `X-Forwarded-Proto`，或该请求来自不受信任的代理地址。
