# Docker 部署

Docker 是推荐部署方式。关键不是容器本身，而是把 `/app/data` 持久化到宿主机。

## docker run

```bash
mkdir -p ./data

docker run -d \
  --name komari \
  --restart unless-stopped \
  -p 25774:25774 \
  -v "$(pwd)/data:/app/data" \
  ghcr.io/nuomiiiii/komari:latest
```

也可以固定正式版本：

```bash
docker pull ghcr.io/nuomiiiii/komari:2.2.3
```

镜像包含 `linux/amd64` 和 `linux/arm64`。

启动后访问：

```text
http://服务器地址:25774
```

## Docker Compose

```yaml
services:
  komari:
    image: ghcr.io/nuomiiiii/komari:latest
    container_name: komari
    restart: unless-stopped
    ports:
      - "25774:25774"
    volumes:
      - ./data:/app/data
```

```bash
docker compose up -d
docker compose logs -f komari
```

## 端口和访问控制

`-p 25774:25774` 默认会发布到宿主机所有可用地址。Docker 发布端口仍会经过宿主机网络栈，但部分系统中的 Docker 防火墙链可能早于普通防火墙规则，不能只看面板里是否“放行”。

只希望本机反向代理访问时，可绑定回环地址：

```yaml
ports:
  - "127.0.0.1:25774:25774"
```

如果通过 VPN 地址直连，应绑定对应宿主机 VPN 地址，而不是容器内部的 `127.0.0.1`。

## 内置 HTTPS 的额外映射

<div class="version-note"><strong>2.1.12</strong><span>内置 HTTPS 已纳入 2.1.12 正式版；仅当后台已经启用该功能时才需要映射 HTTPS 监听端口。</span></div>

默认 HTTPS 端口为 `35938`，示例：

```yaml
ports:
  - "25774:25774"
  - "35938:35938"
volumes:
  - ./data:/app/data
  - ./certs:/certs:ro
```

后台填写的是容器内路径，例如 `/certs/fullchain.pem` 和 `/certs/privkey.pem`。

## 更新容器

```bash
docker pull ghcr.io/nuomiiiii/komari:latest
docker rm -f komari
```

随后使用原来的端口和卷挂载重新创建容器。删除容器不会删除宿主机的 `./data`，但写错挂载路径会让新容器看起来像全新安装。

## 验证

```bash
docker ps --filter name=komari
docker logs --tail 100 komari
```

日志应包含当前版本、七位构建码、指标库初始化成功和 `Starting server on 0.0.0.0:25774`。
