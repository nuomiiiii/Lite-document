# Docker 部署

Docker 是推荐部署方式。关键不是容器本身，而是把 `/app/data` 持久化到宿主机。

## docker run

```bash
mkdir -p ./data

docker run -d \
  --name lite \
  --restart unless-stopped \
  -p 27777:27777 \
  -v "$(pwd)/data:/app/data" \
  ghcr.io/nuomiiiii/lite:latest
```

也可以先单独拉取当前正式版：

```bash
docker pull ghcr.io/nuomiiiii/lite:latest
```

镜像包含 `linux/amd64` 和 `linux/arm64`。

镜像默认时区为 `Asia/Shanghai`。需要使用其他时区时，可以在容器中覆盖 `TZ` 环境变量。镜像声明 Lite 默认 HTTP/HTTPS 端口 `27777` 和 `36888`；是否真正对外开放仍由 `ports` 映射、后台 HTTPS 设置和宿主机防火墙共同决定。

启动后访问：

```text
http://服务器地址:27777
```

## Docker Compose

```yaml
services:
  lite:
    image: ghcr.io/nuomiiiii/lite:latest
    container_name: lite
    restart: unless-stopped
    ports:
      - "27777:27777"
    volumes:
      - ./data:/app/data
    environment:
      TZ: Asia/Shanghai
```

```bash
docker compose up -d
docker compose logs -f lite
```

## 端口和访问控制

`-p 27777:27777` 默认会发布到宿主机所有可用地址。Docker 发布端口仍会经过宿主机网络栈，但部分系统中的 Docker 防火墙链可能早于普通防火墙规则，不能只看面板里是否“放行”。

只希望本机反向代理访问时，可绑定回环地址：

```yaml
ports:
  - "127.0.0.1:27777:27777"
```

如果通过 VPN 地址直连，应绑定对应宿主机 VPN 地址，而不是容器内部的 `127.0.0.1`。

## 内置 HTTPS 的额外映射

仅当后台已经启用内置 HTTPS 时才需要映射 HTTPS 监听端口。默认 HTTPS 端口为 `36888`，示例：

```yaml
ports:
  - "27777:27777"
  - "36888:36888"
volumes:
  - ./data:/app/data
  - ./certs:/certs:ro
```

后台填写的是容器内路径，例如 `/certs/fullchain.pem` 和 `/certs/privkey.pem`。

## 容器内程序路径

当前镜像使用 `/app/Lite` 作为程序入口。为了让旧容器配置可以平滑更新，`/app/komari` 仍作为兼容启动路径保留；新建 Compose、面板模板或健康检查时请统一使用 `/app/Lite`，不要继续复制旧路径。

## 更新容器

```bash
docker pull ghcr.io/nuomiiiii/lite:latest
docker rm -f lite
```

随后使用原来的端口和卷挂载重新创建容器。删除容器不会删除宿主机的 `./data`，但写错挂载路径会让新容器看起来像全新安装。

## 验证

```bash
docker ps --filter name=lite
docker logs --tail 100 lite
```

日志应包含当前版本、七位构建码、指标库初始化成功和 `Starting server on 0.0.0.0:27777`。
