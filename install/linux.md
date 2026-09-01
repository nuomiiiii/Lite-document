# Linux 脚本安装

本项目官方安装脚本适合使用 systemd 的常见 Linux 发行版。这里的“官方”专指 `nuomiiiii/lite` 仓库下方命令使用的脚本，不是上游仓库的安装脚本。

一行安装：

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/nuomiiiii/lite/main/install-lite.sh)"
```

如果希望先查看脚本内容，再分步下载和运行：

```bash
curl -fsSL https://raw.githubusercontent.com/nuomiiiii/lite/main/install-lite.sh -o install-lite.sh
chmod +x install-lite.sh
sudo ./install-lite.sh
```

脚本会让你选择稳定版或快照版、监听端口和安装操作。默认安装目录为 `/opt/lite`，服务名为 `lite.service`。

下载、校验或服务启动失败时，脚本会回滚到安装前状态，避免留下不完整的程序、服务单元或数据目录。旧版数据目录与完整备份可继续沿用；新部署仍按原安装流程初始化。

## 常用命令

```bash
sudo systemctl status lite
sudo systemctl restart lite
sudo journalctl -u lite -f
```

再次运行安装脚本可进入更新、卸载或维护菜单。

## 一键更新的限制

后台一键更新只在运行环境满足原子回退要求时开放，主要包括：

- 由本项目官方脚本安装并通过 systemd 管理。
- 当前进程属于 `lite.service`。
- 主数据库和监控数据库位于受管 `data` 目录内。
- 未使用外置 MySQL 或 PostgreSQL 指标库。
- 数据目录布局允许完整备份和原子恢复。

Docker、Windows、非 systemd 或外置指标数据库会保留 Release 入口，但不会显示为可安全一键回退。

::: info 从旧命名升级
从 Komari 或 Komari Lite 脚本部署升级时，Lite 会沿用已有数据和明确配置的监听端口。完成迁移后，新脚本使用 `/opt/lite`、`Lite` 二进制和 `lite.service`；不要同时启动新旧服务指向同一份数据。
:::

## 防火墙

如果需要公网直连，请只放行实际使用的端口，并尽量限制来源地址。正式环境建议使用 HTTPS、反向代理或可信 VPN，不要长期开着没有访问控制的管理端口。
