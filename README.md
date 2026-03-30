# MCGA — Make Coffee Great Again ☕

一款为咖啡爱好者打造的微信小程序，精确记录每一次冲煮参数，量化品质评分，用数据驱动你的咖啡进阶之路。

## 功能特色

- ☁️ **微信云端同步** — 数据存储在微信云数据库，跨设备随时查看
- 🔐 **微信一键登录** — 30 天免登录缓存，OpenID 隔离用户数据
- 📝 **完整冲煮记录** — 20+ 参数：豆子信息、冲煮参数、环境参数、品质评分
- 🎯 **滚轮精准调参** — 滚轮选择器输入数值参数，精度达 0.5，自动记忆上次参数
- ⭐ **六维品质评分** — 香气、酸质、甜度、醇厚度、余韵、综合（1–5 分）
- 📊 **统计分析面板** — 冲煮总数、平均评分、按方式分组分析
- 📤 **分享日志** — 一键分享单条咖啡日志至微信好友
- 📄 **无限滚动列表** — 首次加载 5 条，后续每次加载 10 条

## 项目结构

```
MCGA-MakeCoffeeGreatAgain/
├── miniprogram/                    # 小程序前端
│   ├── app.js                      # 应用入口：云初始化、登录状态管理、全局错误处理
│   ├── app.json                    # 页面路由 & 窗口配置
│   ├── app.wxss                    # 全局样式（咖啡色系主题）
│   ├── config.local.example.js     # 云环境 ID 配置模板
│   ├── sitemap.json                # 微信搜索索引配置
│   ├── images/                     # 烘焙度图标资源
│   │   └── roast_levels/           # light → dark 五档烘焙图
│   ├── pages/
│   │   ├── index/                  # 首页 — 日志列表、登录态判断、无限滚动
│   │   ├── login/                  # 登录页 — 微信授权、昵称设置、登出
│   │   ├── add-log/                # 新增/编辑 — 豆子、冲煮、环境、评分表单
│   │   ├── log-detail/             # 详情页 — 参数网格、品质条形图、编辑/删除
│   │   └── stats/                  # 统计页 — 汇总卡片、按方式展开详情
│   └── utils/
│       └── filters.wxs             # 模板过滤器：日期、时间、粉水比、方式/烘焙映射
├── cloudfunctions/
│   └── coffeeLogFunctions/         # 云函数（Serverless）
│       ├── index.js                # 统一入口：按 type 路由到各处理函数
│       ├── package.json            # 依赖：wx-server-sdk ~2.4.0
│       └── config.json             # 云函数权限配置
├── project.config.json             # 微信开发者工具项目配置
└── README.md
```

## 记录内容

### 🫘 豆子信息
| 字段 | 说明 |
|------|------|
| 咖啡豆名称 | 必填，用于标识日志 |
| 烘焙度 | 浅烘 / 中浅 / 中度 / 中深 / 深烘（可视化豆子图标选择） |

### ☕ 冲煮参数
| 字段 | 范围 | 步进 | 单位 |
|------|------|------|------|
| 冲煮方式 | 手冲 / 意式 / 冷萃 | — | — |
| 磨豆机型号 | 文本输入 | — | — |
| 研磨度 | 0–50 | 0.5 | 格 |
| 粉量 | 0–50 | 0.5 | g |
| 水量 | 0–500 | 5 | ml |
| 水温 | 0–100 | 0.5 | °C |
| 萃取时间 | 0–600 | 1 | 秒 |
| 粉水比 | 自动计算 | — | 1:X.X |

### 🌡️ 环境参数
- 气温、湿度、备注

### ⭐ 品质评分（1–5 分）
- 香气 · 酸质 · 甜度 · 醇厚度 · 余韵 · 综合

## 技术架构

```
┌──────────────────────────────────────┐
│       微信小程序（WXML/WXSS/JS）       │
│  index · login · add-log · detail · stats │
└──────────────┬───────────────────────┘
               │  wx.cloud.callFunction
               ▼
┌──────────────────────────────────────┐
│     coffeeLogFunctions（云函数）       │
│  login · addLog · getLogs · getLog    │
│  updateLog · deleteLog · getStats     │
│  updateNickname                       │
└──────────────┬───────────────────────┘
               │  wx-server-sdk
               ▼
┌──────────────────────────────────────┐
│        微信云数据库（文档型）           │
│  collections: users · coffee_logs     │
└──────────────────────────────────────┘
```

| 层级 | 技术栈 |
|------|--------|
| 前端 | 微信小程序（WXML / WXSS / JS） |
| 后端 | 微信云开发（Serverless 云函数） |
| 数据库 | 微信云数据库（文档型 NoSQL） |
| 依赖 | `wx-server-sdk` ~2.4.0 |

## 云函数 API

所有请求通过 `wx.cloud.callFunction({ name: 'coffeeLogFunctions', data: { type, ... } })` 调用。

| type | 说明 | 参数 | 返回 |
|------|------|------|------|
| `login` | 微信登录/注册 | — | `{ openid, nickname, lastLoginAt }` |
| `updateNickname` | 更新昵称 | `nickname` | `{ success }` |
| `addLog` | 新增日志 | `data: { beanName, brewMethod, ... }` | `{ success, id }` |
| `updateLog` | 更新日志 | `id, data` | `{ success }` |
| `deleteLog` | 删除日志 | `id` | `{ success }` |
| `getLogs` | 分页获取日志列表 | `skip, pageSize` | `{ success, data: [...] }` |
| `getLog` | 获取单条日志 | `id` | `{ success, data }` |
| `getStats` | 统计分析 | — | `{ totalBrews, avgOverall, methodStats, ... }` |

## 数据库集合

### `users`
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 微信 OpenID（自动） |
| `nickname` | string | 用户昵称 |
| `createdAt` | Date | 注册时间 |
| `lastLoginAt` | Date | 最近登录时间 |

### `coffee_logs`
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 所属用户 |
| `beanName` | string | 咖啡豆名称 |
| `roastLevel` | string | 烘焙度 (light/medium_light/medium/medium_dark/dark) |
| `brewMethod` | string | 冲煮方式 (pourover/espresso/coldbrew) |
| `grinderModel` | string | 磨豆机型号 |
| `grindSize` | number | 研磨度 |
| `coffeeDose` | number | 粉量 (g) |
| `waterAmount` | number | 水量 (ml) |
| `waterTemp` | number | 水温 (°C) |
| `brewTime` | number | 萃取时间 (秒) |
| `ambientTemp` | number | 环境温度 |
| `humidity` | number | 湿度 |
| `remarks` | string | 备注 |
| `aroma` | number | 香气评分 (1–5) |
| `acidity` | number | 酸质评分 (1–5) |
| `sweetness` | number | 甜度评分 (1–5) |
| `body` | number | 醇厚度评分 (1–5) |
| `aftertaste` | number | 余韵评分 (1–5) |
| `overall` | number | 综合评分 (1–5) |
| `notes` | string | 品鉴笔记 |
| `createdAt` | Date | 创建时间 |
| `updatedAt` | Date | 更新时间 |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/<your-username>/MCGA-MakeCoffeeGreatAgain.git
```

### 2. 配置云环境

```bash
cp miniprogram/config.local.example.js miniprogram/config.local.js
```

编辑 `config.local.js`，填入你的云环境 ID：

```js
module.exports = {
  cloudEnvId: 'your-cloud-env-id'
}
```

### 3. 创建数据库集合

在 [微信云开发控制台](https://developers.weixin.qq.com/) → 数据库中创建以下集合：

| 集合名 | 权限 |
|--------|------|
| `coffee_logs` | 仅创建者可读写 |
| `users` | 仅创建者可读写 |

### 4. 部署云函数

使用微信开发者工具：右键 `cloudfunctions/coffeeLogFunctions` → 上传并部署（云端安装依赖）

### 5. 运行小程序

使用 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 打开项目根目录，编译预览即可。

## UI 设计

- 🎨 **咖啡色系主题** — 主色 `#4A2C2A`（巧克力棕）、背景 `#FFF8F0`（奶油色）、点缀 `#C4A882`（摩卡金）
- 📱 **RPX 响应式布局** — 适配不同屏幕尺寸
- 🫘 **Emoji 烘焙选择器** — 可视化烘焙度选择
- 🎡 **底部滚轮选择器** — 精准数值输入体验
- 📊 **渐变条形图** — 品质评分可视化展示

## License

MIT

