# MCGA — Make Coffee Great Again ☕

一款为咖啡爱好者打造的微信小程序，精确记录每一次冲煮参数，提供引导式冲煮计时器，用数据驱动你的咖啡进阶之路。

## 功能特色

- ☕ **引导式冲煮** — 内置一刀流 / 三段式等手冲手法配方，分步计时器引导注水量与节奏
- 📝 **完整冲煮记录** — 豆子信息、冲煮参数、环境参数，支持手动新增与编辑
- 👍👎 **口感反馈** — 好喝 / 难喝一键评价，难喝可选原因（太苦、太酸、自定义）
- 🛠️ **器具管理** — 维护常用磨豆机、滤杯、咖啡豆清单，冲煮时快速选取
- 📊 **统计分析** — 冲煮总数、好喝率、难喝原因排行、冲煮方式分布
- 🎯 **滚轮精准调参** — 滚轮选择器输入数值参数，自动记忆上次参数
- 🔐 **微信一键登录** — 30 天免登录缓存，OpenID 隔离用户数据
- ☁️ **微信云端同步** — 数据存储在微信云数据库，跨设备随时查看
- 📤 **分享日志** — 一键分享单条咖啡日志至微信好友
- 📄 **无限滚动列表** — 首次加载 3 条，后续每次加载 10 条，支持下拉刷新
- 🔍 **筛选与搜索** — 首页按口感筛选（全部 / 好喝 / 难喝），支持多条件高级搜索

## 项目结构

```
MCGA/
├── miniprogram/                    # 小程序前端
│   ├── app.js                      # 应用入口：云初始化、登录状态管理、全局错误处理
│   ├── app.json                    # 页面路由 & 窗口配置（8 个页面）
│   ├── app.wxss                    # 全局样式（iOS 风格主题）
│   ├── config.local.example.js     # 云环境 ID 配置模板
│   ├── sitemap.json                # 微信搜索索引配置
│   ├── images/                     # 图标资源
│   │   ├── icon_home.svg           # 首页图标
│   │   ├── icon_gear.svg           # 器具图标
│   │   ├── icon_stats.svg          # 统计图标
│   │   └── roast_levels/           # light → dark 五档烘焙度图片
│   ├── pages/
│   │   ├── index/                  # 首页 — 统计卡片、筛选标签、日志列表、无限滚动
│   │   ├── login/                  # 登录页 — 微信授权、昵称设置、登出
│   │   ├── add-log/                # 新增/编辑 — 豆子、冲煮、环境参数表单
│   │   ├── log-detail/             # 详情页 — 参数网格、口感展示、编辑/删除/分享
│   │   ├── stats/                  # 统计页 — 汇总卡片、方式分布、难喝原因排行
│   │   ├── brew/                   # 引导冲煮 — 手法选择、配方加载、分步计时器
│   │   ├── equipment/              # 器具管理 — 咖啡豆、磨豆机、滤杯的增删管理
│   │   └── onboarding/             # 新手引导 — 首次登录后设置磨豆机和滤杯
│   └── utils/
│       └── filters.wxs             # WXS 过滤器：日期、冲煮方式、烘焙度、口感映射
├── cloudfunctions/
│   └── coffeeLogFunctions/         # 云函数（Serverless）
│       ├── index.js                # 统一入口：按 type 路由到 14 个处理函数
│       ├── package.json            # 依赖：wx-server-sdk ~2.4.0
│       └── config.json             # 云函数权限配置
├── project.config.json             # 微信开发者工具项目配置
└── README.md
```

## 页面说明

### 🏠 首页（index）
主面板，展示统计摘要卡片（冲煮总数、好喝率、最常见难喝原因）和冲煮日志列表。支持按口感筛选（全部 / 好喝 / 难喝），首次加载 3 条，后续滚动加载 10 条，支持本地缓存秒开和下拉刷新。底部两个浮动按钮：左侧进入引导冲煮，右侧进入手动记录。

### ☕ 引导冲煮（brew）
四阶段状态机驱动的引导式冲煮页面：
1. **选择方式** — 手冲 / 冷萃（冷萃 Coming Soon）
2. **配置参数** — 选择咖啡豆、磨豆机、滤杯、研磨度、水温；选择冲煮手法（一刀流 / 三段式）和具体配方
3. **倒计时预览** — 展示配方步骤概览，5 秒倒计时
4. **计时冲煮** — 分步引导注水量和注水方式，实时进度条和注水量显示，支持暂停/继续/停止
5. **口感反馈** — 冲煮结束后选择好喝/难喝，自动保存日志到云端

### 📝 新增/编辑日志（add-log）
手动记录冲煮参数的表单页面。支持从详情页跳转进入编辑模式，自动加载上次使用的参数。

### 📋 日志详情（log-detail）
展示单条冲煮日志的完整参数、口感评价和随机激励语句。支持编辑、删除（确认弹窗）和分享至微信好友。

### 📊 统计页（stats）
展示冲煮总数、好喝率、好喝/难喝数量、最常见难喝原因和各冲煮方式占比条形图。

### 🛠️ 器具管理（equipment）
管理用户的咖啡豆（含烘焙度）、磨豆机和滤杯清单。所有变更即时同步至云端。

### 👋 新手引导（onboarding）
首次登录后的两步引导：第一步添加至少一台磨豆机，第二步选择性添加滤杯。完成后标记引导完成。

### 🔐 登录页（login）
微信一键登录，可选填昵称。登录后展示已登录状态，支持修改昵称和登出。

## 记录内容

### 🫘 豆子信息
| 字段 | 说明 |
|------|------|
| 咖啡豆名称 | 必填，用于标识日志 |
| 烘焙度 | 浅烘 / 中浅 / 中度 / 中深 / 深烘（可视化豆子图标选择） |

### ☕ 冲煮参数
| 字段 | 范围 | 步进 | 单位 |
|------|------|------|------|
| 冲煮方式 | 手冲 / 冷萃 | — | — |
| 冲煮手法 | 一刀流 / 三段式 | — | — |
| 磨豆机型号 | 从器具列表选择 | — | — |
| 滤杯型号 | 从器具列表选择 | — | — |
| 研磨度 | 1–60 | 0.5 | 格 |
| 粉量 | 0–50 | 0.5 | g |
| 水量 | 0–500 | 5 | ml |
| 水温 | 0–100 | 0.5 | °C |
| 萃取时间 | 0–600 | 1 | 秒 |
| 粉水比 | 自动计算 | — | 1:X.X |

### 🌡️ 环境参数
| 字段 | 范围 | 单位 |
|------|------|------|
| 气温 | -10–50 | °C |
| 湿度 | 0–100 | % |
| 备注 | 自由输入 | — |

### 👍👎 口感评价
| 字段 | 说明 |
|------|------|
| 口感 | 好喝 / 难喝 |
| 难喝原因 | 太苦 / 太酸 / 自定义原因（多选） |
| 品鉴笔记 | 自由输入 |

## 技术架构

```
┌───────────────────────────────────────────┐
│         微信小程序（WXML / WXSS / JS）       │
│  index · login · add-log · log-detail      │
│  stats · brew · equipment · onboarding     │
└──────────────────┬────────────────────────┘
                   │  wx.cloud.callFunction
                   ▼
┌───────────────────────────────────────────┐
│       coffeeLogFunctions（云函数）           │
│  login · addLog · getLogs · getLog          │
│  updateLog · deleteLog · getStats           │
│  updateNickname · saveEquipment             │
│  getEquipment · completeOnboarding          │
│  getBrewRecipe · getRecipeNames             │
│  getFilteredLogs                            │
└──────────────────┬────────────────────────┘
                   │  wx-server-sdk
                   ▼
┌───────────────────────────────────────────┐
│          微信云数据库（文档型 NoSQL）         │
│  users · coffee_logs · brew_recipes         │
└───────────────────────────────────────────┘
```

| 层级 | 技术栈 |
|------|--------|
| 前端 | 微信小程序（WXML / WXSS / JS） |
| 后端 | 微信云开发（Serverless 云函数） |
| 数据库 | 微信云数据库（文档型 NoSQL） |
| 依赖 | `wx-server-sdk` ~2.4.0 |

## 云函数 API

所有请求通过 `wx.cloud.callFunction({ name: 'coffeeLogFunctions', data: { type, ... } })` 调用。

### 用户管理

| type | 说明 | 参数 | 返回 |
|------|------|------|------|
| `login` | 微信登录/注册 | — | `{ openid, nickname, onboardingDone }` |
| `updateNickname` | 更新昵称 | `nickname` | `{ success }` |
| `completeOnboarding` | 标记引导完成 | — | `{ success }` |

### 日志 CRUD

| type | 说明 | 参数 | 返回 |
|------|------|------|------|
| `addLog` | 新增冲煮日志 | `data: { beanName, brewMethod, ... }` | `{ success, id }` |
| `updateLog` | 更新日志 | `id, data` | `{ success }` |
| `deleteLog` | 删除日志 | `id` | `{ success }` |
| `getLogs` | 分页获取日志列表 | `skip, pageSize` | `{ success, data: [...] }` |
| `getLog` | 获取单条日志 | `id` | `{ success, data }` |
| `getFilteredLogs` | 多条件筛选日志 | `filters: { brewMethod, taste, beanName, ... }` | `{ success, data: [...] }` |

### 统计与器具

| type | 说明 | 参数 | 返回 |
|------|------|------|------|
| `getStats` | 统计分析 | — | `{ totalBrews, goodCount, badCount, goodRate, topBadReasons, methodCounts }` |
| `saveEquipment` | 保存器具列表 | `grinders, filterCups, beans` | `{ success }` |
| `getEquipment` | 获取器具列表 | — | `{ success, data: { grinders, filterCups, beans } }` |

### 冲煮配方

| type | 说明 | 参数 | 返回 |
|------|------|------|------|
| `getRecipeNames` | 获取手法下配方名称列表 | `technique` | `{ success, data: [...] }` |
| `getBrewRecipe` | 获取具体配方步骤 | `technique, recipeName` | `{ success, data: { steps, totalTime } }` |

## 数据库集合

### `users`
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 微信 OpenID（自动） |
| `nickname` | string | 用户昵称 |
| `onboardingDone` | boolean | 是否完成新手引导 |
| `grinders` | string[] | 磨豆机列表 |
| `filterCups` | string[] | 滤杯列表 |
| `beans` | object[] | 咖啡豆列表 `[{ name, roastLevel }]` |
| `createdAt` | Date | 注册时间 |
| `lastLoginAt` | Date | 最近登录时间 |

### `coffee_logs`
| 字段 | 类型 | 说明 |
|------|------|------|
| `_openid` | string | 所属用户 |
| `beanName` | string | 咖啡豆名称 |
| `roastLevel` | string | 烘焙度（`light` / `medium_light` / `medium` / `medium_dark` / `dark`） |
| `brewMethod` | string | 冲煮方式（`pourover` / `coldbrew`） |
| `brewTechnique` | string | 冲煮手法（`yidaoliu` / `sanduanshi`） |
| `grinderModel` | string | 磨豆机型号 |
| `filterCup` | string | 滤杯型号 |
| `grindSize` | number | 研磨度 |
| `coffeeDose` | number | 粉量（g） |
| `waterAmount` | number | 水量（ml） |
| `waterTemp` | number | 水温（°C） |
| `brewTime` | number | 萃取时间（秒） |
| `ambientTemp` | number | 环境温度 |
| `humidity` | number | 湿度 |
| `remarks` | string | 备注 |
| `taste` | string | 口感（`good` / `bad`） |
| `badReasons` | string[] | 难喝原因（`too_bitter` / `too_sour` / `other:自定义`） |
| `notes` | string | 品鉴笔记 |
| `createdAt` | Date | 创建时间 |
| `updatedAt` | Date | 更新时间 |

### `brew_recipes`
| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 配方名称 |
| `technique` | string | 冲煮手法（`yidaoliu` / `sanduanshi`） |
| `steps` | object[] | 步骤列表 `[{ startTime, label, description, pourPattern?, waterAmount? }]` |
| `totalTime` | number | 总时长（秒） |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/<your-username>/MCGA.git
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
| `users` | 仅创建者可读写 |
| `coffee_logs` | 仅创建者可读写 |
| `brew_recipes` | 所有用户可读，仅管理员可写 |

> 💡 `brew_recipes` 集合需要预先导入冲煮配方数据，用于引导冲煮功能。

### 4. 部署云函数

使用微信开发者工具：右键 `cloudfunctions/coffeeLogFunctions` → 上传并部署（云端安装依赖）

### 5. 运行小程序

使用 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 打开项目根目录，编译预览即可。

## UI 设计

- 🎨 **iOS 风格主题** — 深色文字 `#1C1C1E`、灰色背景 `#F2F2F7`、毛玻璃卡片效果
- 📱 **RPX 响应式布局** — 适配不同屏幕尺寸
- 🫘 **烘焙度图片选择器** — 五档烘焙度可视化选择
- 🎡 **底部滚轮选择器** — 精准数值输入体验
- 📊 **百分比条形图** — 冲煮方式分布和统计可视化
- ⏱️ **冲煮计时器** — 带进度条和步骤标记的实时计时界面
- 💬 **激励语句** — 每次冲煮后随机展示鼓励文案

## License

MIT

