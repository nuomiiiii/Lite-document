# Linux 脚本安装

本项目官方安装脚本支持使用 systemd 的常见 Linux 发行版，以及 OpenWrt / iStoreOS 等使用 procd 的软路由。这里的“官方”专指 `nuomiiiii/lite` 仓库中的脚本。

官方 Linux 包提供 `amd64`、`arm64`、`386`、`riscv64` 和 `loong64`。软路由也需要匹配其中一种架构；不能仅根据设备运行 OpenWrt 就判断可以安装。

## 下载并安装

复制以下一行命令，即可下载并运行安装脚本：

```sh
curl -fsSL https://raw.githubusercontent.com/nuomiiiii/lite/main/install-lite.sh -o install-lite.sh && sudo sh install-lite.sh
```

OpenWrt / iStoreOS 通常直接使用 root 登录，也可能没有 bash、sudo 或 curl。以 root 登录后，复制以下一行命令即可使用 wget 下载并安装：

```sh
wget -O install-lite.sh https://raw.githubusercontent.com/nuomiiiii/lite/main/install-lite.sh && sh install-lite.sh
```

脚本会让你选择稳定版或快照版、监听端口和安装操作。默认安装目录为 `/opt/lite`，默认端口为 `27777`。systemd 环境使用 `lite.service`，procd 环境使用 `/etc/init.d/lite`。安装完成后访问 `http://服务器或路由器地址:27777`。

下载、校验或服务启动失败时，脚本会尝试回滚到安装前状态。旧版数据目录与完整备份可继续沿用；新部署按页面引导初始化。

## 常用命令

### systemd 主机

```bash
sudo systemctl status lite
sudo systemctl restart lite
sudo journalctl -u lite -f
```

### OpenWrt / iStoreOS

```sh
/etc/init.d/lite status
/etc/init.d/lite restart
logread -e lite
```

再次运行安装脚本可进入更新、卸载或维护菜单。

## 一键更新的限制

官方脚本安装的 systemd 和 procd 实例均可在满足条件时使用后台“立即更新”。主要条件包括：

- 以 root 运行，当前进程由脚本登记的 Lite 服务管理。
- 主数据库和 SQLite 监控数据库位于受管 `data` 目录内。
- 未使用外置 MySQL 或 PostgreSQL 指标库。
- 数据目录可以完整备份和恢复；`data` 本身不是独立挂载点。
- 软路由具备启动独立更新助手所需的系统工具，实际以后台检测结果为准。

更新成功后页面会刷新；新版本启动失败或检查未通过时，会尝试恢复旧程序和更新前数据。更新前仍应保留完整备份，详细步骤见[更新与数据库迁移](/install/update#linux-直装更新)。

Docker、Windows、不受支持的服务管理方式、外置指标数据库或不满足回退条件的实例会提供 Release 入口，需要按部署方式手动更新。

::: info 从旧命名升级
从 Komari 或 Komari Lite 脚本部署升级时，Lite 会沿用已有数据和明确配置的监听端口。完成迁移后使用 `/opt/lite`、`Lite` 二进制和对应的 Lite 服务；不要同时启动新旧服务指向同一份数据。
:::

## 防火墙

如果需要公网直连，请只放行实际使用的端口，并尽量限制来源地址。正式环境建议使用 HTTPS、反向代理或可信 VPN，不要长期开着没有访问控制的管理端口。
