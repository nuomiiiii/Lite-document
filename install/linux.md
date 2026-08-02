# Linux 脚本安装

官方脚本适合使用 systemd 的常见 Linux 发行版。

```bash
curl -fsSL https://raw.githubusercontent.com/nuomiiiii/komari/main/install-komari.sh -o install-komari.sh
chmod +x install-komari.sh
sudo ./install-komari.sh
```

脚本会让你选择稳定版或快照版、监听端口和安装操作。默认安装目录为 `/opt/komari`，服务名为 `komari.service`。

## 常用命令

```bash
sudo systemctl status komari
sudo systemctl restart komari
sudo journalctl -u komari -f
```

再次运行安装脚本可进入更新、卸载或维护菜单。

## 一键更新的限制

后台一键更新只在运行环境满足原子回退要求时开放，主要包括：

- 由官方脚本安装并通过 systemd 管理。
- 当前进程属于 `komari.service`。
- 主数据库和监控数据库位于受管 `data` 目录内。
- 未使用外置 MySQL 或 PostgreSQL 指标库。
- 数据目录布局允许完整备份和原子恢复。

Docker、Windows、非 systemd 或外置指标数据库会保留 Release 入口，但不会伪装成可以安全一键回退。

## 防火墙

如果需要公网直连，请只放行实际使用的端口，并尽量限制来源地址。正式环境建议使用 HTTPS、反向代理或可信 VPN，不要长期开着没有访问控制的管理端口。
