# 二进制安装

从 [Releases](https://github.com/nuomiiiii/lite/releases) 下载与系统和架构匹配的文件。

## Linux

```bash
chmod +x Lite-linux-amd64
./Lite-linux-amd64 server -l 0.0.0.0:27777
```

可用架构包括 `386`、`amd64`、`arm64`、`loong64` 和 `riscv64`，以对应 Release 的产物为准。

## Windows

下载 `Lite-windows-amd64.exe` 或与你设备匹配的版本，在单独目录中运行：

```powershell
.\Lite-windows-amd64.exe server -l 0.0.0.0:27777
```

默认数据目录位于程序工作目录下的 `data`。不要从下载目录临时运行后再移动单独的程序文件，否则容易把数据留在旧目录。

新安装未传入 `-l` 时默认监听 `0.0.0.0:27777`。从旧数据目录升级且没有显式指定监听地址时，Lite 会保留旧安装使用的端口，避免升级后访问地址无故变化。

## 校验文件

Release 同时提供 `SHA256SUMS`。正式部署前建议校验下载文件，避免网络缓存或第三方镜像返回错误内容。

Linux 示例：

```bash
sha256sum -c SHA256SUMS --ignore-missing
```
