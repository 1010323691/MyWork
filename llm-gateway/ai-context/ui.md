# UI 层文档（前端页面）

## 模块职责

使用 Thymeleaf 模板引擎渲染 HTML 页面，配合原生 JavaScript + CSS 实现交互。项目采用模块化布局，通过 fragments 复用公共组件。

---

## 目录结构

```
src/main/resources/
├── static/
│   ├── css/           # 样式文件
│   │   ├── common.css    # 通用样式（栅格、按钮、表单）
│   │   ├── login.css     # 登录页样式
│   │   ├── dashboard.css # Dashboard 样式
│   │   ├── logs.css      # 日志页样式
│   │   └── admin.css     # 管理员页面样式
│   └── js/            # JavaScript 文件
│       ├── common.js       # 通用工具函数（API 请求封装）
│       ├── login.js        # 登录逻辑
│       ├── register.js     # 注册逻辑
│       ├── dashboard.js    # Dashboard 交互
│       ├── logs.js         # 日志查询
│       └── admin-*.js      # 管理员页面脚本
└── templates/
    ├── layout/
    │   └── base.html       # 基础布局模板（含导航、侧边栏）
    ├── fragments/          # 可复用片段
    │   ├── head.html       # <head> 区域
    │   ├── nav.html        # 顶部导航栏
    │   ├── sidebar.html    # 左侧菜单栏
    │   ├── modal.html      # 弹窗组件
    │   ├── scripts.html    # 公共脚本引入
    │   └── alerts.html     # 提示消息区域
    └── pages/             # 页面文件
        ├── login.html      # 登录页
        ├── register.html   # 注册页
        ├── dashboard/
        │   └── index.html  # Dashboard（API Key 管理 + 使用统计）
        ├── logs/
        │   └── index.html  # 请求日志查询
        └── admin/          # 管理员页面
            ├── users.html      # 用户管理
            ├── keys.html       # API Keys 全局管理
            ├── providers.html  # 后端服务配置
            ├── pricing.html    # 定价设置
            └── monitor.html    # 系统监控
```

---

## 页面列表

### 1. 公开页面（无需认证）

| 路径 | 文件 | 说明 | JS 依赖 |
|------|------|------|--------|
| `/login` | `pages/login.html` | 用户登录页 | login.js |
| `/register` | `pages/register.html` | 新用户注册页 | register.js |

---

### 2. 普通用户页面（需认证）

| 路径 | 文件 | 说明 | JS 依赖 |
|------|------|------|--------|
| `/dashboard` | `pages/dashboard/index.html` | Dashboard：API Key 管理 + Token 统计 | dashboard.js |
| `/logs` | `pages/logs/index.html` | 请求日志查询（分页、过滤） | logs.js |

**Dashboard 标签页**:
- **API Key 管理**: 创建/查看/删除 API Keys
- **使用统计**: 今日/Month Token、总请求数、成功率图表
- **客户端工具**: Token 余量查询入口

---

### 3. 管理员页面（需 ADMIN 角色）

| 路径 | 文件 | 说明 | JS 依赖 |
|------|------|------|--------|
| `/admin/users` | `pages/admin/users.html` | 用户列表管理 | admin-users.js |
| `/admin/keys` | `pages/admin/keys.html` | API Keys 全局查看 | admin-keys.js |
| `/admin/providers` | `pages/admin/providers.html` | 后端服务配置 | admin-providers.js |
| `/admin/pricing` | `pages/admin/pricing.html` | Token 定价设置 | admin-pricing.js |
| `/admin/monitor` | `pages/admin/monitor.html` | 系统监控仪表板 | admin-monitor.js |

---

## 前端 API 调用映射

### common.js 工具函数

```javascript
// 封装的 fetch wrapper，自动处理认证和错误
async function api(url, options = {}) {
    // 自动添加 Authorization header（Session Cookie）或 X-API-Key
    // 统一错误处理，弹出提示框
}
```

### Dashboard API 调用 (`dashboard.js`)

| JS 函数 | HTTP 端点 | 说明 |
|--------|----------|------|
| `loadApiKeys()` | GET /api/admin/apikeys | 获取用户 API Keys |
| `createApiKey()` | POST /api/admin/apikeys | 创建新 Key |
| `toggleApiKey(id)` | PUT /api/admin/apikeys/{id}/toggle | 启用/禁用 |
| `deleteApiKey(id)` | DELETE /api/admin/apikeys/{id} | 删除 Key |
| `loadUserStats()` | GET /api/user/stats | 获取统计数据 |
| `checkTokenUsage()` | (客户端工具) | Token 余量查询 |

### Logs API 调用 (`logs.js`)

| JS 函数 | HTTP 端点 | 说明 |
|--------|----------|------|
| `loadLogs(filters)` | GET /api/user/logs?page=... | 分页查询日志 |
| `viewLogDetail(id)` | GET /api/user/logs/{id} | 查看详情 |

---

## 样式系统

### common.css（核心样式）

**颜色变量**:
```css
--primary-color: #C9A86C;    /* 金色主色调 */
--bg-primary: #FDFBF7;       /* 米白背景 */
--text-main: #1D2530;        /* 深灰文字 */
--border-light: rgba(201, 168, 108, 0.3);
```

**栅格系统**: `.row` + `.col`（类似 Bootstrap）  
**按钮组件**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`  
**表单组件**: `.form-group`, `.input`, `.select`  
**卡片组件**: `.card`, `.card-title`

---

## 修改指引

| 需求 | 操作方式 |
|------|----------|
| 新增页面 | `templates/pages/` 新建 html，继承 base.html |
| 添加导航菜单 | `fragments/nav.html` + `fragments/sidebar.html` |
| 新增 API 调用 | `common.js` 中添加 api() wrapper，或各页 JS 直接 fetch |
| 修改样式主题 | `common.css` 中修改变量（--primary-color 等） |
| 添加弹窗组件 | 引用 `fragments/modal.html` + JS 控制显示 |

---

## 第三方依赖

- **ECharts**: CDN 引入，用于 Dashboard Token 趋势图表
- **Thymeleaf**: 模板引擎（后端集成）
