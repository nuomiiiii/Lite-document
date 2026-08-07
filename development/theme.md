# 主题开发

Komari Lite 主题是一个包含静态站点和清单文件的 ZIP 包。主题只替换公共监控页面；管理员后台、远程终端和文件管理继续使用内置界面。

本页按 Lite 当前服务端和 `nuomiiiii/komari-web` 的实际行为整理。API 字段见 [API 与 RPC2](/development/api)。

::: info 与上游主题的关系
Lite 继续兼容上游主题的 ZIP、`komari-theme.json` 和基础公共接口约定，因此未标注差异的基础打包与接入方式可按相同方式使用。Lite 新增的配置类型、缓存行为或注入差异会在对应小节明确标注，不需要主题作者自行猜测。
:::

## 最小目录

```text
my-theme.zip
├── komari-theme.json
├── preview.png
└── dist/
    ├── index.html
    ├── favicon.ico
    └── assets/
        ├── app-a1b2c3.js
        └── app-a1b2c3.css
```

ZIP 根目录必须直接包含 `komari-theme.json`。不要再套一层仓库目录，也不要上传 GitHub 自动生成的源码压缩包。

主题可正常使用的必要条件：

- 根目录存在有效的 `komari-theme.json`。
- `dist/index.html` 是可直接运行的生产构建。
- HTML 引用的所有 JS、CSS、字体和图片都包含在包内或来自明确允许的 HTTPS 地址。
- 自定义路由不占用 `/admin` 和 `/terminal`。

## 清单文件

```json
{
  "name": "Komari Example Theme",
  "short": "example-theme",
  "description": "A responsive theme for Komari Lite",
  "version": "1.0.0",
  "author": "Example Author",
  "url": "https://github.com/example/komari-theme",
  "preview": "preview.png",
  "navigation": {
    "server_detail": "/server/{uuid}",
    "server_network": "/server/{uuid}?view=network",
    "ping_task_parameter": "ping_task"
  },
  "configuration": {
    "type": "managed",
    "name": {
      "zh-CN": "示例主题设置",
      "en": "Example Theme Settings"
    },
    "data": []
  }
}
```

### 顶层字段

| 字段 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 完整主题名称 |
| `short` | string | 是 | 唯一目录名 |
| `description` | string | 建议 | 主题说明 |
| `version` | string | 建议 | 建议使用语义化版本 |
| `author` | string | 建议 | 作者或团队 |
| `url` | string | 否 | 项目主页 |
| `preview` | string | 否 | 相对主题根目录的预览图 |
| `navigation` | object | 否 | 仪表盘跳转到主题服务器页面的路由声明 |
| `configuration` | object | 否 | 后台动态配置入口 |

`short` 只能包含 ASCII 字母、数字、下划线和连字符。自定义主题不能使用 `default`，也不能包含空格、斜杠、反斜杠或 `..`。

### 仪表盘导航

`navigation` 让后台排行按当前启用主题的真实路由生成链接：

| 字段 | 说明 |
| --- | --- |
| `server_detail` | 服务器详情路径模板，必须包含 `{uuid}` |
| `server_network` | 服务器网络总览路径模板，必须包含 `{uuid}`；不填时回退到详情页 |
| `ping_task_parameter` | Ping 任务 ID 的查询参数名，例如 `ping_task` |

路径必须是站内绝对路径，不能包含协议、域名、反斜杠或越级片段。服务端会对 UUID 和查询参数进行编码。`2.2.1` 中平均时延与延迟抖动排行使用 `server_network`；近 15 分钟丢包使用 `server_detail` 并附带最差任务 ID。

未提供 `navigation` 的旧主题仍可安装，服务端会使用兼容回退地址。新主题应显式声明这三个字段，使不同 Komari 版本和第三方主题切换时都能保持正确跳转。

服务端上传限制：

- 最多 10,000 个文件。
- 单文件解压后最多 128 MiB。
- 全包解压后最多 512 MiB。
- `komari-theme.json` 最多 1 MiB。

这些是安全上限，不是推荐体积。实际主题应尽量保持在数 MiB 内，并压缩图片和字体。

## 配置入口

`configuration.type` 支持：

| 类型 | `data` | 后台行为 |
| --- | --- | --- |
| `managed` | 配置项数组 | 由内置后台生成表单 |
| `raw` | 非空 HTML 字符串 | 在后台内容区域用 iframe 显示 |
| `redirect` | 站内相对路径 | 跳转到主题自己的设置页面 |

未写 `type` 的旧主题在部分界面会按 `managed` 识别，但服务端默认值合并要求显式 `type: "managed"`。新主题不要省略该字段。

### configuration 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `type` | string | `managed`、`raw` 或 `redirect` |
| `icon` | string | 后台菜单图标或图片 URL，可选 |
| `name` | string \| object | 后台入口名称，可多语言 |
| `data` | array \| string | 由 type 决定 |

### managed 配置

```json
{
  "configuration": {
    "type": "managed",
    "icon": "/themes/example-theme/dist/assets/settings.svg",
    "name": {
      "zh-CN": "主题设置",
      "en": "Theme Settings"
    },
    "data": [
      {
        "type": "title",
        "name": { "zh-CN": "外观", "en": "Appearance" }
      },
      {
        "key": "compactCards",
        "type": "switch",
        "name": "紧凑卡片",
        "default": true,
        "help": "减少移动端卡片留白"
      },
      {
        "key": "accentColor",
        "type": "select",
        "name": "强调色",
        "options": "green,blue,red",
        "default": "green"
      },
      {
        "key": "maxWidth",
        "type": "number",
        "name": "内容最大宽度",
        "default": 1440
      },
      {
        "key": "backgroundUrl",
        "type": "string",
        "name": "背景图片 URL",
        "default": ""
      },
      {
        "key": "footerHtml",
        "type": "richtext",
        "name": "页脚 HTML",
        "default": ""
      }
    ]
  }
}
```

配置项字段：

| 字段 | 适用范围 | 说明 |
| --- | --- | --- |
| `type` | 全部 | `title`、`switch`、`select`、`number`、`string`、`richtext` |
| `name` | 全部 | 字符串或多语言对象 |
| `key` | 除 `title` | 保存到 `theme_settings` 的唯一键 |
| `required` | 文本类 | 是否必填 |
| `options` | `select` | 逗号分隔选项 |
| `default` | 除 `title` | 默认值 |
| `help` | 除 `title` | 帮助文本，可多语言 |

默认值合并规则：

- 管理员保存值优先。
- `select` 没有默认值时使用第一个选项。
- `number` 默认 `0`。
- `switch` 默认 `false`。
- `string`、`richtext` 默认空字符串。

公开页面通过 `/api/public` 的 `data.theme_settings` 获取最终值：

```js
const response = await fetch("/api/public");
const { data } = await response.json();
const compact = data.theme_settings?.compactCards ?? true;
```

`theme_settings` 是公开数据。不要声明密码、Token、Webhook 密钥或仅管理员可见的信息。

### 多语言文本

`configuration.name`、配置项 `name` 和 `help` 可写成对象：

```json
{
  "zh-CN": "背景图片",
  "zh-TW": "背景圖片",
  "en": "Background image",
  "ja": "背景画像"
}
```

后台优先匹配完整语言代码，再匹配基础语言，最后回退到对象中的首个值。仍应提供一个可读的默认语言，不要依赖对象键顺序表达业务含义。

### raw 配置

```json
{
  "configuration": {
    "type": "raw",
    "icon": "Code",
    "name": "高级主题设置",
    "data": "<!doctype html><html><body><main id=\"app\"></main></body></html>"
  }
}
```

raw HTML 来自主题包并在后台 iframe 中显示。只安装可信主题；主题作者仍应避免读取父页面 Cookie、注入远程脚本或发起未经用户确认的管理操作。

### redirect 配置

```json
{
  "configuration": {
    "type": "redirect",
    "icon": "Settings",
    "name": "主题设置",
    "data": "settings/theme"
  }
}
```

目标必须是站内路径。允许 query 和 hash；绝对 URL、`//`、反斜杠和路径中间的 `..` 会被拒绝。路径会按站点根目录规范化，部署在子路径时必须实测最终地址。

不要跳转到 `/admin` 或 `/terminal`，这两个路径由内置应用接管。

## index.html

推荐基础结构：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="A simple server monitor tool." />
    <title>Komari Monitor</title>
    <script type="module" src="/assets/app-a1b2c3.js"></script>
    <link rel="stylesheet" href="/assets/app-a1b2c3.css" />
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

### 服务端注入

当前 Lite 行为：

- 现有 `<title>` 会被站点名称替换；没有 title 时会自动插入。
- 服务端会持续同步 `document.title`，主题运行时不要反复覆盖它。
- 字面量 `A simple server monitor tool.` 会替换为站点描述。
- 小写 `</head>` 前插入管理员 `custom_head`。
- 小写 `</body>` 前插入管理员 `custom_body` 和主题切换刷新脚本。

因此必须保留规范的小写 `</head>`、`</body>`，并建议保留上面的 description 占位文本。这是明确的 Lite 差异：与上游旧说明不同，title 不再要求严格等于某个固定标签，但写标准占位符仍最兼容。

管理员自定义 HTML 不可信。主题不应把该内容再拼进脚本字符串、属性或 `innerHTML` 之外的危险上下文。

### viewport 与移动端

必须包含：

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

移动端输入框字体至少 16px，可避免 iOS 聚焦时自动放大。列表应在窄屏切换为卡片或可读的分组布局，不应只缩小桌面表格。

## 资源路径

启用主题后，`dist` 下资源可从站点根路径访问：

```text
dist/assets/app-a1b2c3.js -> /assets/app-a1b2c3.js
dist/logo.png            -> /logo.png
```

也可以显式访问主题根目录：

```text
/themes/example-theme/dist/assets/settings.svg
```

该前缀适合 manifest 的 `icon`、预览辅助资源或需要引用未启用主题的管理界面。公共主题页面本身优先使用构建工具生成的根路径。

Favicon 优先级：

1. 管理员上传的 `data/favicon.ico`。
2. 当前主题的 `dist/favicon.ico`。
3. 内置默认资源。

## SPA 路由

服务端支持 History API 路由。GET 请求没有匹配到主题文件时会返回 `dist/index.html`，因此 Vue Router、React Router 等 history 模式可直接使用。

限制：

- `/admin` 和 `/terminal` 始终加载内置应用。
- 不存在的 JS/CSS 文件也可能落到 SPA index，浏览器会报 MIME 或模块加载错误；发布前必须检查所有资源路径。
- 非 GET 请求不会进入主题 SPA fallback。
- 不要在公共主题中重做后台管理入口。

## 缓存策略

- `index.html` 不缓存，保证站点名称、描述和主题切换及时生效。
- `sw.js`、`service-worker.js`、`registersw.js`、`manifest.webmanifest` 不缓存。
- `/assets/` 下带哈希样式文件名可被长期 immutable 缓存。

构建产物应使用内容哈希，例如 `app-a1b2c3.js`。更新主题时不要复用相同文件名却改变内容，否则 CDN 和浏览器可能继续使用旧资源。

Service Worker 容易跨主题保留旧资源。除非确实需要离线能力，否则主题不要注册全站 Service Worker；必须使用时，应设计版本升级和注销流程。

## 公共数据接入

推荐加载顺序：

1. `/api/public` 获取站点和主题配置。
2. `/api/nodes` 或 `common:getNodes` 获取节点资料。
3. `/api/clients` WebSocket 获取实时状态。
4. `public:queryMetrics` 获取图表历史。

示例：

```js
async function rpc(method, params = {}) {
  const response = await fetch("/api/rpc2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: crypto.randomUUID(),
    }),
  });
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message);
  return payload.result;
}

const metrics = await rpc("public:queryMetrics", {
  metric_keys: ["cpu.usage", "memory.used"],
  entity_ids: ["node-uuid"],
  hours: 24,
  server_downsample: true,
  max_points: 500,
});
```

主题不要一次读取所有节点的长时间原始序列。按当前页面节点和可见时间范围请求，并缓存参数完全相同的结果。

## 本地存储

默认主题使用：

| 键 | 类型 | 说明 |
| --- | --- | --- |
| `appearance` | `light` \| `dark` \| `system` | 外观模式 |
| `language` | string | 语言代码，例如 `zh-CN` |

第三方主题可复用这些键以保持切换体验。新增键应加主题前缀，避免与其他主题冲突。

## 打包与验收

构建后从产物目录创建 ZIP，确保 manifest 位于根目录：

```text
komari-theme.json
preview.png
dist/index.html
dist/assets/...
```

发布前至少验证：

1. ZIP 根目录和 `short` 合法。
2. 首页、节点详情和自定义 SPA 路由可直接刷新。
3. PC 列表和手机卡片均无横向溢出。
4. 360px 宽度下按钮、长名称和数值不重叠。
5. 浅色、深色和系统模式可读。
6. 实时 WebSocket 断线后可重连。
7. 24/48 小时历史查询启用服务端降采样。
8. 私有站点、隐藏节点和临时分享不会泄露数据。
9. 切换主题后不残留旧 Service Worker 或缓存资源。
10. `/admin`、`/terminal` 和 `/favicon.ico` 行为正常。

## 与默认前端的关系

- 前端仓库：[nuomiiiii/komari-web](https://github.com/nuomiiiii/komari-web)
- 服务端仓库：[nuomiiiii/komari](https://github.com/nuomiiiii/komari)
- 安装与启用：[主题管理](/themes/)
- 接口字段：[API 与 RPC2](/development/api)
- 兼容策略：[兼容与公共接口](/development/compatibility)

自定义主题不需要复制后台代码，也不应依赖默认前端的私有组件路径。把 API 适配、状态管理和视觉组件分开，后续协议升级时只需调整适配层。
