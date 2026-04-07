# UI 层 - 前端页面

## 模块概览
Thymeleaf 服务端渲染 + 原生 JavaScript/CSS。

---

## 文件结构

```
src/main/resources/
├── static/
│   ├── css/
│   │   ├── common.css      # 公共样式
│   │   ├── login.css       # 登录页样式
│   │   └── dashboard.css   # 管理后台样式
│   └── js/
│       ├── common.js       # 公共工具类
│       ├── login.js        # 登录页逻辑
│       └── dashboard.js    # 管理后台逻辑
└── templates/
    ├── fragments/
    │   ├── head.html       # 页面头片段
    │   ├── header.html     # 导航栏片段
    │   ├── alerts.html     # 提示框片段
    │   └── scripts.html    # 脚本引入片段
    ├── login.html          # 登录页面
    └── dashboard.html      # 管理后台页面
```

---

## 页面清单

### 1. `login.html`
**路由**: `/login`
**功能**: 用户登录

**交互**:
- 用户名/密码输入
- 提交登录表单 → POST `/api/auth/login`
- 成功 → 保存 Token → 跳转到 `/dashboard`
- 失败 → 显示错误提示

**JS 文件**: `login.js`

---

### 2. `dashboard.html`
**路由**: `/dashboard`
**功能**: API Key 管理后台

**标签页**:
1. **API Key 管理** - 创建/查看/删除 API Key
2. **使用统计** - 显示统计卡片
3. **客户端工具** - Token 余量查询

**权限展示**:
- USER: 只能查看和管理自己的 API Key
- ADMIN: 可以管理所有用户的 API Key

**JS 文件**: `dashboard.js`

---

## JavaScript 工具类

### `common.js` - 全局工具

#### API 类
**职责**: HTTP 请求封装

| 方法 | 说明 |
|-----|-----|
| `get(endpoint)` | GET 请求 |
| `post(endpoint, data)` | POST 请求 |
| `put(endpoint, data)` | PUT 请求 |
| `delete(endpoint)` | DELETE 请求 |
| `getAuthToken()` | 获取 JWT Token |
| `isAuthenticated()` | 检查是否已登录 |
| `getCurrentUser()` | 获取当前用户信息 |

**配置**: `API_CONFIG.BASE_URL = '/api'`

---

#### UI 类
**职责**: UI 操作封装

| 方法 | 说明 |
|-----|-----|
| `showErrorMessage(msg)` | 显示错误提示 |
| `showSuccessMessage(msg)` | 显示成功提示 |
| `copyToClipboard(text)` | 复制到剪贴板 |
| `formatNumber(num)` | 千分位格式化 |
| `formatDate(date)` | 日期格式化 |
| `switchTab(tabId)` | 切换标签页 |
| `debounce(func, wait)` | 防抖函数 |

---

#### FormValidation 类
**职责**: 表单验证

| 方法 | 说明 |
|-----|-----|
| `required(value, fieldName)` | 非空验证 |
| `email(value)` | 邮箱格式验证 |
| `minLength(value, min, fieldName)` | 最小长度验证 |
| `number(value, fieldName)` | 数字验证 |
| `minValue(value, min, fieldName)` | 最小值验证 |

---

### `login.js` - 登录页逻辑

**核心函数**:
| 函数 | 说明 |
|-----|-----|
| `handleLogin(e)` | 处理登录提交 |
| `checkExistingSession()` | 检查已登录会话 |

**流程**:
1. 检查 localStorage 是否有 Token
2. 有 Token → 自动跳转到 /dashboard
3. 表单提交 → API.post('/auth/login')
4. 成功 → 保存 Token 到 localStorage → 跳转

---

### `dashboard.js` - 管理后台逻辑

**核心函数**:
| 函数 | 说明 |
|-----|-----|
| `checkAuth()` | 检查认证状态 |
| `initUIBasedOnRole()` | 根据角色初始化 UI |
| `loadApiKeys()` | 加载 API Keys 列表 |
| `renderApiKeyTable()` | 渲染表格 |
| `createApiKey()` | 创建 API Key |
| `deleteApiKey(id)` | 删除 API Key |
| `toggleApiKey(id)` | 启用/禁用 API Key |
| `copyApiKey(key)` | 复制 API Key |
| `checkTokenUsage()` | 查询 Token 余量 |
| `logout()` | 退出登录 |

**权限逻辑**:
```javascript
currentUserRole === 'USER' → 
  - 表格只显示复制按钮
  - 标题显示"仅显示您的 API Key"

currentUserRole === 'ADMIN' → 
  - 表格显示启用/禁用、删除按钮
  - 可以查看所有用户的 API Key
```

---

## CSS 样式

### `common.css`
- 全局重置
- 按钮样式
- 表单样式
- 卡片样式
- 表格样式
- 工具类（.d-none, .badge-success 等）

### `login.css`
- 登录卡片居中布局
- 表单样式

### `dashboard.css`
- 标签页样式
- 统计卡片样式
- 用户信息栏样式

---

## 页面流转

```
访问 / → 重定向到 /login
    ↓
未登录 → 显示登录表单
    ↓
登录成功 → 保存 Token → 跳转到 /dashboard
    ↓
已登录 → 直接显示管理后台
    ↓
点击退出 → 清除 Token → 跳转到 /login
```

---

## Thymeleaf 片段复用

### `fragments/head.html`
```html
<title>, <meta>, CSS 引入
```

### `fragments/header.html`
```html
导航栏，用户信息，退出按钮
```

### `fragments/alerts.html`
```html
成功/错误提示框
```

### `fragments/scripts.html`
```html
common.js 和页面专用 JS 引入
```

---

## 修改影响

| 修改文件 | 影响范围 |
|---------|--------|
| login.html / login.js | 登录页面 |
| dashboard.html / dashboard.js | 管理后台页面 |
| common.js | 所有页面共享工具 |
| common.css | 所有页面共享样式 |
| templates/fragments/*.html | 所有页面复用片段 |

---

## 注意事项

1. **Thymeleaf 数据传递**: 使用 `th:inline="javascript"` 将后端数据传递到前端
2. **权限控制**: 前端显示权限是视觉层面，后端 API 才是真正的权限控制
3. **XSS 防护**: dashboard.js 有 `escapeHtml()` 函数，但使用场景有限
4. **AJAX 请求**: 所有 API 请求通过 `common.js` 中的 `API` 类封装
5. **Token 存储**: JWT Token 存储在 localStorage，退出时清除
