# UI Layer - Frontend Architecture

## 概述
前端采用 Thymeleaf 服务端渲染配合原生 JavaScript，无构建工具。所有 AJAX 请求统一走 `static/js/common.js` 中的 `API` 工具类。

## 主要目录

```text
src/main/resources/
├── static/
│   ├── css/
│   │   ├── common.css
│   │   ├── common-tech-theme.css
│   │   ├── admin.css
│   │   ├── logs.css
│   │   └── balance-detail.css
│   └── js/
│       ├── common.js
│       ├── dashboard.js
│       ├── logs.js
│       ├── user-balance.js
│       ├── admin-users.js
│       ├── admin-keys.js
│       ├── admin-providers.js
│       ├── admin-monitor.js
│       └── echarts-tech-theme.js
└── templates/
    ├── fragments/
    └── pages/
```

## 通用前端基础

### `common.js`
- `API.request()` 自动加 `/api` 前缀
- 自动携带 Session Cookie
- `401/403` 自动跳转登录页
- `UI.showErrorMessage()` 和 `UI.copyToClipboard()` 负责通用交互

### 布局与片段
- `fragments/sidebar.html` 负责左侧导航
- `fragments/nav.html` 定义菜单项
- `fragments/user-profile.html` 依赖页面脚本提供全局 `logout()`

## 页面与脚本映射

### 公开页面
| URL | 模板 | 脚本 |
|-----|------|------|
| `/login` | `pages/login.html` | `login.js` |
| `/register` | `pages/register.html` | `register.js` |

### 用户/管理员共用页面
| URL | 模板 | 脚本 | 说明 |
|-----|------|------|------|
| `/dashboard` | `pages/dashboard/index.html` | `dashboard.js` | 仪表板主页 |
| `/apikeys` | `pages/admin/keys.html` | `admin-keys.js` | API Key 页面 |
| `/logs` | `pages/logs/index.html` | `logs.js` | 请求日志查询 |

### 用户页面
| URL | 模板 | 脚本 | 说明 |
|-----|------|------|------|
| `/user/balance` | `pages/user/balance.html` | `user-balance.js` | 余额明细、充值入口、金额变动流水 |

### 管理页面
| URL | 模板 | 脚本 | 说明 |
|-----|------|------|------|
| `/admin/users` | `pages/admin/users.html` | `admin-users.js` | 用户管理 |
| `/admin/providers` | `pages/admin/providers.html` | `admin-providers.js` | 上游供应商管理 |
| `/admin/monitor` | `pages/admin/monitor.html` | `admin-monitor.js` | 实时资源与模型负载监控 |

## 当前前后端对应关系

### Dashboard
```javascript
API.get('/dashboard/summary') -> DashboardController.getSummary()
```

### 日志页
```javascript
API.get('/apikeys') -> ApiKeyController.listApiKeys()
API.get('/admin/logs?...') -> AdminLogController.getLogs()
API.get('/user/logs?...') -> UserController.getUserLogs()
```

说明：
- `logs.js` 统一通过 `/apikeys` 拉取下拉框数据，不再区分 `/admin/apikeys` 和 `/user/apikeys`

### 余额明细页
```javascript
API.get('/balance/current') -> UserBalanceController.getCurrentBalance()
API.get('/balance/transactions?page=0&size=20') -> UserBalanceController.getCurrentUserTransactions()
API.get('/user/stats') -> UserController.getUserStats()
```

说明：
- 页面展示真实余额流水，不再复用请求日志充当金额明细
- 充值按钮目前是“人工充值申请”入口，不伪造在线支付能力
- 页面样式主要由 `balance-detail.css` 提供

### 管理监控页
```javascript
API.get('/admin/monitor') -> AdminController.getMonitorStats()
API.get('/dashboard/summary') -> DashboardController.getSummary()
```

说明：
- `/admin/monitor` 提供 CPU、内存、GPU 与监控卡片数据
- `/dashboard/summary` 提供 `modelMetrics`，用于模型占比、Token 消耗、延迟图表
- 已移除页面内 mock 数据与随机回退

## 修改指南
- 新增页面时，优先复用 `common.js` 的 `API` 和 `UI`
- 需要页面级逻辑时，新建独立 `static/js/*.js`，不要把大段脚本塞回模板
- 需要新增用户资金页面时，优先复用 `/api/balance/*` 而不是从请求日志侧推金额
