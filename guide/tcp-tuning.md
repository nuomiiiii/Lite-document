---
title: TCP 调优
description: TCP 调优脚本的运行命令与参数填写说明。
---

# TCP 调优

以下脚本为**个人自用版本**，仅供参考。网上有很多 TCP 调优脚本，可根据自己的需求任选使用。

## 运行脚本

在需要调优的 Linux 服务器上，以 **root 用户**运行：

```bash
bash <(curl -Ls https://raw.githubusercontent.com/nuomiiiii/BBR/refs/heads/main/bbr.sh)
```

按脚本提示，根据当前服务器的实际情况填写**网络延迟（ms）、内存（MB）和上行带宽（Mbps）**，核对参数后确认应用。
