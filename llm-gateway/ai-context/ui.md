# UI 层文档

## 概述
UI 层负责前端页面渲染和交互，使用 Thymeleaf 模板引擎和 Vanilla JavaScript。前端采用 Session/Cookie 认证模式，通过 `/api` 端点与后端交互。

## 文件清单

### 模板文件
| 文件 | 路径 | 描述 |
|------|------|------|
| base.html | `src/main/resources/templates/layout/base.html` | 基础布局模板 |
| login.html | `src/main/resources/templates/pages/login.html` | 登录页面 |
| register.html | `src/main/resources/templates/pages/register.html` | 注册页面 |
| dashboard.html | `src/main/resources/templates/pages/dashboard/index.html` | 仪表盘页面 |
| logs.html | `src/main/resources/templates/pages/logs/index.html` | 日志页面 |
| admin-users.html | `src/main/resources/templates/pages/admin/users.html` | 用户管理页面 |
| admin-keys.html | `src/main/resources/templates/pages/admin/keys.html` | API Key 管理页面 |
| admin-monitor.html | `src/main/resources/templates/pages/admin/monitor.html` | 系统监控页面 |

### 片段文件
| 文件 | 路径 | 描述 |
|------|------|------|
| head.html | `src/main/resources/templates/fragments/head.html` | 页面头部 |
| nav.html | `src/main/resources/templates/fragments/nav.html` | 导航栏 |
| sidebar.html | `src/main/resources/templates/fragments/sidebar.html` | 侧边栏 |
| alerts.html | `src/main/resources/templates/fragments/alerts.html` | 消息提示 |
| modal.html | `src/main/resources/templates/fragments/modal.html` | 模态框 |
| card.html | `src/main/resources/templates/fragments/card.html` | 卡片组件 |
| form.html | `src/main/resources/templates/fragments/form.html` | 表单组件 |
| scripts.html | `src/main/resources/templates/fragments/scripts.html` | 公共脚本 |
| stats-card.html | `src/main/resources/templates/fragments/stats-card.html` | 统计卡片 |
| user-profile.html | `src/main/resources/templates/fragments/user-profile.html` | 用户信息 |

### JavaScript 文件
| 文件 | 路径 | 描述 |
|------|------|------|
| common.js | `src/main/resources/static/js/common.js` | 公共工具类（API、UI） |
| login.js | `src/main/resources/static/js/login.js` | 登录逻辑 |
| register.js | `src/main/resources/static/js/register.js` | 注册逻辑 |
| dashboard.js | `src/main/resources/static/js/dashboard.js` | 仪表盘逻辑 |
| logs.js | `src/main/resources/static/js/logs.js` | 日志查询逻辑 |
| admin-users.js | `src/main/resources/static/js/admin-users.js` | 用户管理逻辑 |
| admin-keys.js | `src/main/resources/static/js/admin-keys.js` | API Key 管理逻辑 |
| admin-monitor.js | `src/main/resources/static/js/admin-monitor.js` | 系统监控逻辑 |

---

## 页面结构

### 登录页面 (login.html)
**路径**: `/login`

**功能**:
- 用户名密码登录表单
- 错误提示显示
- 自动重定向到仪表盘

**JavaScript**: `login.js`
```javascript
- 表单提交拦截
- AJAX 调用 /api/auth/login
- 错误处理
- 登录成功跳转 /dashboard
```

### 注册页面 (register.html)
**路径**: `/register`

**功能**:
- 用户名、密码、邮箱注册
- 表单验证
- 错误提示

**JavaScript**: `register.js`
```javascript
- 表单验证（FormValidation）
- AJAX 调用 /api/auth/register
- 注册成功跳转 /login
```

### 仪表盘页面 (dashboard/index.html)
**路径**: `/dashboard`

**功能**:
- Token 使用统计（今日、本月）
- 请求统计
- API Key 列表
- 创建 API Key
- Token 使用趋势图表（ECharts）
- 客户端 Token 查询工具

**JavaScript**: `dashboard.js`
```javascript
- 认证检查（Session）
- 加载 API Keys
- 加载统计数据
- 渲染图表
- 创建/删除 API Key
- 复制 API Key
```

**API 调用**:
- `GET /api/admin/apikeys` - 获取 API Keys
- `POST /api/admin/apikeys` - 创建 API Key
- `DELETE /api/admin/apikeys/{id}` - 删除 API Key
- `GET /api/user/stats` - 获取统计
- `GET /api/clients/token-usage` - 查询 Token 余量

### 日志页面 (logs/index.html)
**路径**: `/logs`

**功能**:
- 分页查询请求日志
- 关键字搜索
- 状态过滤（成功/失败）
- 详情查看

**JavaScript**: `logs.js`
```javascript
- 分页加载日志
- 搜索过滤
- 详情弹窗
```

**API 调用**:
- `GET /api/user/logs` - 分页查询日志
- `GET /api/user/logs/{id}` - 查看日志详情

### 用户管理页面 (admin/users.html)
**路径**: `/admin/users`

**权限**: 仅管理员可见

**功能**:
- 用户列表（分页）
- 用户名搜索
- 启用/禁用用户
- 删除用户

**JavaScript**: `admin-users.js`
```javascript
- 管理员权限检查
- 分页加载用户
- 搜索用户
- 启用/禁用操作
- 删除确认
```

**API 调用**:
- `GET /api/admin/users` - 用户列表
- `PUT /api/admin/users/{id}/toggle` - 启用/禁用
- `DELETE /api/admin/users/{id}` - 删除用户

### API Key 管理页面 (admin/keys.html)
**路径**: `/admin/keys`

**权限**: 仅管理员可见

**功能**:
- 所有用户的 API Key 列表
- 更新 Key 配置
- 重置使用量

**JavaScript**: `admin-keys.js`

**API 调用**:
- `GET /api/admin/keys` - Key 列表
- `PUT /api/admin/keys/{id}` - 更新配置
- `POST /api/admin/keys/{id}/reset-usage` - 重置使用量

### 系统监控页面 (admin/monitor.html)
**路径**: `/admin/monitor`

**权限**: 仅管理员可见

**功能**:
- 系统总请求数
- 成功/失败统计
- Token 消耗统计
- 平均响应时间
- 错误率

**JavaScript**: `admin-monitor.js`

**API 调用**:
- `GET /api/admin/monitor` - 监控数据

---

## JavaScript 工具类

### API 类 (common.js)
**职责**: 封装 HTTP 请求

**方法**:
```javascript
API.isAuthenticated() - 检查 Session 是否有效
API.getCurrentUser() - 获取当前用户信息
API.get(endpoint) - GET 请求
API.post(endpoint, data) - POST 请求
API.put(endpoint, data) - PUT 请求
API.delete(endpoint) - DELETE 请求
```

**认证**:
- 自动携带 Session Cookie（credentials: 'same-origin'）
- 支持自定义请求头（用于 API Key 认证）

**错误处理**:
- 401/403 → 跳转登录页
- 超时 → 提示重试

### UI 类 (common.js)
**职责**: 封装 UI 操作

**方法**:
```javascript
UI.showAlert(message, type) - 显示消息提示
UI.showErrorMessage(message) - 显示错误
UI.showSuccessMessage(message) - 显示成功
UI.copyToClipboard(text) - 复制文本
UI.formatNumber(num) - 数字格式化
UI.formatDate(dateString) - 日期格式化
UI.switchTab(tabId) - 切换标签页
UI.confirm(message, callback) - 确认对话框
```

### FormValidation 类 (common.js)
**职责**: 表单验证

**方法**:
```javascript
FormValidation.required(value, fieldName) - 非空验证
FormValidation.email(value) - 邮箱验证
FormValidation.minLength(value, min, fieldName) - 最小长度
FormValidation.number(value, fieldName) - 数字验证
FormValidation.minValue(value, min, fieldName) - 最小值
```

---

## Thymeleaf 模板

### 基础布局 (base.html)
```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <th:block th:include="fragments/head :: head" />
</head>
<body>
    <th:block th:include="fragments/nav :: nav" />
    <th:block th:include="fragments/sidebar :: sidebar" />
    <main>
        <th:block th:include="fragments/alerts :: alerts" />
        <th:block th:replace="${content}" />
    </main>
    <th:block th:include="fragments/scripts :: scripts" />
</body>
</html>
```

### 页面引用
```html
<th:block th:replace="pages/login.html" />
<th:block th:replace="pages/dashboard/index.html" />
```

### 片段引用
```html
<th:block th:include="fragments/card :: card(title: '标题')" />
<th:block th:include="fragments/form :: form" />
```

---

## 前端认证流程

### Session 认证
1. 用户访问页面
2. JavaScript 调用 `API.isAuthenticated()` 检查 Session
3. 后端验证 JSESSIONID Cookie
4. 返回用户信息
5. 页面渲染用户信息

### 权限控制
```javascript
// 管理员页面检查
const user = await API.getCurrentUser();
if (!user || user.role !== 'ADMIN') {
    window.location.href = '/dashboard';
    return;
}
```

### 错误处理
```javascript
// API 请求错误处理
try {
    const data = await API.get('/api/user/stats');
    // 处理数据
} catch (e) {
    if (e.status === 401 || e.status === 403) {
        window.location.href = '/login';
    } else {
        UI.showErrorMessage(e.message);
    }
}
```

---

## 样式规范

### Bootstrap 5
- 使用 Bootstrap 5 栅格系统
- 标准组件：btn, form-control, card, modal, alert

### 自定义样式
```css
.badge-success { background-color: #10b981; }
.badge-danger { background-color: #ef4444; }
.badge-secondary { background-color: #6b7280; }
```

---

## 图表集成 (ECharts)
```javascript
const chart = echarts.init(document.getElementById('chartDiv'));
chart.setOption({
    title: { text: 'Token 趋势' },
    xAxis: { type: 'category', data: ['...'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [0, 100, 200] }]
});
```

---

## 修改定位指南

| 问题类型 | 优先查看文件 | 原因 |
|----------|-------------|-----|
| 页面布局不对 | base.html, 对应页面.html | 模板结构 |
| 数据不加载 | 对应 .js 文件 | API 调用逻辑 |
| 样式不对 | CSS 文件 | 样式定义 |
| 交互不响应 | 对应 .js 文件 | 事件监听 |
| 认证失效 | common.js, login.js | Session 检查 |
| 图表不显示 | dashboard.js | ECharts 初始化 |
| 添加新页面 | 新建 .html + .js | 完整页面结构 |

### 添加新页面步骤
1. 创建 HTML 模板（使用 base.html 布局）
2. 创建 JavaScript 文件（使用 API 类）
3. 在 ViewController 添加路由映射
4. 在侧边栏添加导航链接
5. 测试页面功能
