# 外部监控数据库

Lite 支持将监控数据存入 MySQL、MariaDB 或 PostgreSQL。首次安装时可在“数据存储”步骤填写连接串；已有实例可在后台“系统设置 → 数据与存储 → 监控数据”修改“连接串（DSN）”。系统根据连接串自动识别数据库类型。

## 支持范围

| 数据 | 默认存储 | 外部数据库支持 |
| --- | --- | --- |
| 账号、节点、任务和系统设置 | 本地 SQLite 主数据库 | 当前仅支持 SQLite，继续保留 `data` 目录 |
| 服务器指标、延迟、丢包等监控历史 | `./data/metrics.db` | SQLite、MySQL、MariaDB 或 PostgreSQL |

外部数据库连接配置保存在主数据库中。即使监控数据已外置，Docker 仍需保留 `/app/data` 挂载，Linux 安装也仍需保留原有 `data` 目录。

## 准备数据库与账户

先创建数据库和连接账户，并确认运行 Lite 的服务器或容器能访问数据库。账户需要在目标数据库中建表、建索引及读写数据；保存连接串后，Lite 会自动创建所需表和索引。

已有可用数据库和账户时，可直接填写下一节的连接串。需要新建时，在数据库管理工具中以管理员身份执行对应的一整段 SQL，并把 `ChangeThisPassword` 改为自己的密码。

### MySQL / MariaDB

```sql
CREATE DATABASE lite_metrics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lite'@'%' IDENTIFIED BY 'ChangeThisPassword';
GRANT ALL PRIVILEGES ON lite_metrics.* TO 'lite'@'%';
```

`'lite'@'%'` 允许该账户从其他主机连接。需要限定来源时，可将 `%` 改为实际连接来源地址。

### PostgreSQL

```sql
CREATE USER lite WITH PASSWORD 'ChangeThisPassword';
CREATE DATABASE lite_metrics OWNER lite;
```

## 填写连接串

将下列示例中的数据库地址、端口、用户名、密码和数据库名称替换为实际值。

### MySQL / MariaDB 连接串

```text
lite:ChangeThisPassword@tcp(db.example.com:3306)/lite_metrics?charset=utf8mb4&parseTime=true
```

MySQL 和 MariaDB 使用同一种连接串格式。

### PostgreSQL 连接串

```text
host=db.example.com port=5432 user=lite password=ChangeThisPassword dbname=lite_metrics sslmode=require
```

也支持 PostgreSQL URL 格式：

```text
postgresql://lite:ChangeThisPassword@db.example.com:5432/lite_metrics?sslmode=require
```

`sslmode` 按数据库服务要求设置。支持 TLS 的远程数据库可使用 `require`，需要验证证书与主机名时使用 `verify-full`；同机 Docker 内网中未启用 TLS 的 PostgreSQL 使用 `disable`。URL 中的用户名或密码包含 `@`、`:`、`/` 等特殊字符时，需要进行 URL 编码。

### 后台配置步骤

1. 打开“系统设置 → 数据与存储”，进入“监控数据”页签。
2. 在“连接串（DSN）”中填入完整连接串，点击该项的保存按钮。
3. 等待连接测试和热加载成功。保存成功后，新监控数据写入目标数据库，无需重启 Lite。
4. 已有监控历史时，继续按[迁移已有历史数据](#迁移已有历史数据)操作；首次安装使用空数据库时，可直接查看节点上报和历史曲线。

“高级选项”可先保留默认值：

| 项目 | 默认值 | 说明 |
| --- | --- | --- |
| 表名前缀 | `metric_` | Lite 监控表的名称前缀；迁移时保持与源库一致 |
| 最大连接数 | `25` | MySQL / MariaDB / PostgreSQL 连接池的最大连接数 |
| 最大空闲连接数 | `5` | 连接池保留的空闲连接数 |

数据保留天数继续在“监控数据”页签设置，外置数据库也会按这些规则整理历史数据。

## Docker 连接示例

连接串中的地址必须是 **Lite 容器能够访问的地址**。

| 数据库位置 | 连接串中的地址 |
| --- | --- |
| 同一个 Compose 项目中的数据库容器 | 数据库服务名，例如下面示例中的 `postgres` |
| 另一台服务器或托管数据库 | 对应域名或 IP，并确认数据库允许 Lite 主机连接 |
| Docker 宿主机 | 宿主机可达地址；使用 `host.docker.internal` 时，Linux Docker 通常需添加 `host-gateway` 映射 |

Lite 容器中的 `127.0.0.1` 指向 Lite 容器本身。数据库运行在另一个容器或宿主机时，应填写上表对应地址。

下面是一份 Lite 与 PostgreSQL 同时运行的 `compose.yaml`。数据库通过 Compose 内网连接，不需要映射 `5432` 端口。将 `ChangeThisPassword` 改为自己的密码；已有 Docker 部署可将 `postgres` 服务合并至原 Compose 文件，并沿用现有 Lite 端口和 `data` 挂载。

```yaml
services:
  lite:
    image: ghcr.io/nuomiiiii/lite:latest
    restart: unless-stopped
    ports:
      - "27777:27777"
    volumes:
      - ./data:/app/data
    environment:
      TZ: Asia/Shanghai
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_DB: lite_metrics
      POSTGRES_USER: lite
      POSTGRES_PASSWORD: ChangeThisPassword
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U lite -d lite_metrics"]
      interval: 5s
      timeout: 5s
      retries: 10
```

在 Compose 文件所在目录启动：

```bash
docker compose up -d
```

随后在 Lite 安装引导或后台填写以下连接串，密码与 Compose 中的值保持一致：

```text
host=postgres port=5432 user=lite password=ChangeThisPassword dbname=lite_metrics sslmode=disable
```

数据库已有持久化数据时，修改 Compose 的 `POSTGRES_PASSWORD` 不会自动修改库内账户密码，应先在数据库中更新密码，再同步 Lite 连接串。

连接宿主机数据库且使用 `host.docker.internal` 时，在 `lite` 服务下添加：

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

## 迁移已有历史数据

保存连接串会切换当前使用的数据库；本次保存不会自动将旧库历史数据搬过去。刚切换至空数据库时，旧历史曲线暂时看不到，可通过后台搬运恢复。

1. 切换前备份原数据库，并记录原连接串和表名前缀。
2. 按前面的步骤保存目标数据库连接串，确认保存成功。
3. 打开“数据与存储 → 迁移与维护”，找到“数据库迁移”。
4. “源库连接串（DSN，可选）”留空时，自动使用上一个监控数据库，默认源库为 `./data/metrics.db`。需要指定其他源库时，填写它的完整连接串；目标库为当前运行中的监控数据库。
5. 点击“开始迁移”，等待状态显示“已完成”，再检查原有时间范围内的历史曲线。

迁移期间 Lite 继续运行，新数据写入目标库。源库必须保持可访问；迁移搬运指标定义和历史采样点，不会自动删除源库数据。失败或取消后，可修复原因并重新迁移，同一采样点不会重复添加。迁移过程中应保持当前连接配置，等待完成后再切换其他数据库。

需要切回 SQLite 时，将连接串保存为 `./data/metrics.db`；需要带回外部库新增的历史数据时，再以外部库为源执行迁移。

## 备份与常见问题

外部监控数据库需使用 `mysqldump`、`mariadb-dump` 或 `pg_dump` 等数据库工具单独备份。Lite 后台完整备份要求主库和监控库均为 SQLite；仅备份 `data` 目录不会包含外部监控历史。具体说明见[备份、导入与迁移](/data/backup)。

| 问题 | 检查方式 |
| --- | --- |
| 连接测试失败 | 检查地址、端口、账户密码、数据库名称，以及数据库监听和来源访问规则；测试未通过时，本次设置不会保存 |
| 提示设置已保存，但热加载失败 | 检查目标库建表、建索引权限和 Lite 服务日志，修复后重新保存连接串 |
| Docker 中无法连接数据库 | 检查容器网络和服务名；另一个容器或宿主机数据库使用对应可达地址 |
| PostgreSQL 提示服务器不支持 SSL | 根据实际连接环境调整 `sslmode`；上面的同机 Compose 示例使用 `disable` |
| 保存成功后旧历史曲线为空 | 确认当前目标库和源库，在“迁移与维护”中搬运历史数据 |
| 迁移提示源库和目标库相同 | 检查源库连接串，填写切换前使用的数据库 |
| 本地磁盘占用不再体现全部监控数据 | 外部库的容量需在数据库服务器或托管平台查看；本地 `data` 大小不包含外部库文件 |
