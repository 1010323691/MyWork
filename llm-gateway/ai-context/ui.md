# UI 前端层说明

## 概述

前端基于 Thymeleaf 模板引擎，配合原生 JavaScript (ES6+) 和 CSS3。采用组件化 Fragment 设计模式，实现页面布局复用。UI 主题为科技风格（dark theme），集成 ECharts 数据可视化。

---

## 目录结构

```
src/main/resources/
├── templates/
│   ├── layout/
│   │   └── base.html          # 基础布局模板
│   ├── fragments/             # 可复用组件片段
│   │   ├── head.html          # <head> 公共头部
│   │   ├── nav.html           # 导航栏（权限控制）
│   │   ├── sidebar.html       # 侧边栏容器
│   │   ├── scripts.html       # 全局 JS 引用
│   │   ├── card.html          # 卡片组件模板
│   │   ├── form.html          # 表单组件模板
│   │   ├── modal.html         # 模态框组件
│   │   ├── alerts.html        # 成功/错误提示
│   │   └── stats-card.html    # 统计卡片组件
│   └── pages/                 # 页面模板
│       ├── login.html         # 登录页
│       ├── register.html      # 注册页
│       ├── dashboard/index.html # 仪表盘首页
│       ├── user/balance.html  # 用户余额
│       ├── logs/index.html    # 请求日志查询
│       └── admin/             # 管理员页面
│           ├── users.html     # 用户管理
│           ├── keys.html      # API Key 管理
│           ├── providers.html # Provider 配置
│           ├── pricing.html   # 价格设置
│           └── monitor.html   # 系统监控
└── static/
    ├── css/
    │   ├── common.css         # 通用样式
    │   ├── common-tech-theme.css # Tech 主题配色
    │   ├── login.css          # 登录页样式
    │   ├── dashboard.css      # 仪表盘样式
    │   ├── logs.css           # 日志页样式
    │   └── admin.css          # 后台管理样式
    └── js/
        ├── common.js          # 通用工具类 (API/UI/FormValidation)
        ├── login.js           # 登录交互
        ├── register.js        # 注册表单验证
        ├── dashboard.js       # 仪表盘图表加载
        ├── logs.js            # 日志查询与筛选
        ├── echarts-tech-theme.js # ECharts Tech 主题配置
        └── admin-*.js         # 后台管理各页面脚本
```

---

## Thymeleaf 模板体系

### 基础布局 (base.html)
**路径**: `templates/layout/base.html`  
**职责**: 定义页面骨架，引入 Fragment 组件

| Fragment 引用 | 说明 |
|---------------|------|
| fragments/head | 公共头部（meta/title/css） |
| fragments/sidebar | 侧边栏导航容器 |
| fragments/alerts | 提示信息区域 |
| fragments/scripts | 全局脚本引用 |

**使用方式**:
```html
<th:block th:replace="~{layout/base :: layout(pageTitle, content, extraCss)}">
```

---

### Fragment 组件清单

#### head.html
- `<title>` 动态设置（pageTitle 参数）
- CSS 引用：common.css + common-tech-theme.css
- Favicon 配置

#### sidebar.html  
- 包含侧边栏布局结构
- th:replace fragments/nav 引入导航菜单

#### nav.html
**权限控制逻辑**:
- `currentUserRole == 'ADMIN'` → 显示管理员菜单项（用户管理、计费、风控等）
- 普通用户仅可见：总览、实时监控、请求日志

| 菜单项 | 路由 | 角色要求 |
|--------|------|----------|
| 总览 | /dashboard | 所有认证用户 |
| 实时监控 | /admin/monitor | ADMIN |
| 请求日志 | /logs | 所有认证用户 |
| 用户与用量 | /admin/users | ADMIN |
| API Key | /admin/keys | ADMIN |
| 系统与模型 | /admin/providers | ADMIN |

#### modal.html
**模态框模板**:
- modal-form-base: 通用表单模态框结构
- modal-confirm: 确认对话框

#### alerts.html
- alertBox (error): 错误提示容器
- successBox (success): 成功提示容器

---

## JavaScript 工具类 (common.js)

### API 类（HTTP 请求封装）
**认证模式**: Session/Cookie (`credentials: 'same-origin'`)

| 方法 | 说明 |
|------|------|
| isAuthenticated() | 检查用户是否已登录（调用 /api/auth/me） |
| getCurrentUser() | 获取当前用户信息 |
| request(endpoint, options) | 统一请求处理（超时、错误跳转） |
| get(endpoint) | GET 请求封装 |
| post(endpoint, data) | POST 请求封装 |
| put(endpoint, data) | PUT 请求封装 |
| delete(endpoint) | DELETE 请求封装 |

**特性**:
- 自动携带 Session Cookie
- 401/403 错误跳转到 /login
- 统一超时时间（30 秒）

---

### UI 类（界面交互工具）

| 方法 | 说明 |
|------|------|
| showAlert(message, type) | 显示成功/错误提示 |
| showErrorMessage(message) | 快捷显示错误 |
| showSuccessMessage(message) | 快捷显示成功 |
| copyToClipboard(text) | 复制到剪贴板 |
| formatNumber(num) | 数字千分位格式化 |
| formatDate(dateString) | 日期格式化（zh-CN） |
| switchTab(tabId) | 切换标签页显示 |
| confirm(message, callback) | 确认对话框 |
| debounce(func, wait) | 防抖函数 |

---

### FormValidation 类（表单验证）

| 方法 | 说明 |
|------|------|
| required(value, fieldName) | 非空校验 |
| email(value) | 邮箱格式校验 |
| minLength(value, min, fieldName) | 最小长度校验 |
| number(value, fieldName) | 数字类型校验 |
| minValue(value, min, fieldName) | 最小值校验 |

---

## 页面与 JS 映射关系

| 页面模板 | JavaScript 文件 | CSS 文件 | API Endpoint |
|----------|----------------|---------|--------------|
| pages/login.html | login.js | login.css | /api/auth/login |
| pages/register.html | register.js | - | /api/auth/register |
| pages/dashboard/index.html | dashboard.js | dashboard.css | /api/user/stats, /api/admin/monitor |
| pages/logs/index.html | logs.js | logs.css | /api/user/logs |
| pages/admin/users.html | admin-users.js | admin.css | /api/admin/users* |
| pages/admin/keys.html | admin-keys.js | admin.css | /api/admin/apikeys* |
| pages/admin/providers.html | admin-providers.js | admin.css | /api/admin/providers* |
| pages/admin/pricing.html | admin-pricing.js | admin.css | (待实现) |
| pages/admin/monitor.html | admin-monitor.js | admin.css | /api/admin/monitor |
| pages/user/balance.html | - | - | /api/balance/current |

---

## ECharts 集成

### echarts-tech-theme.js
**职责**: 定义 Tech 风格图表主题（深色背景、霓虹配色）

| 配置项 | 值 |
|--------|------|
| color | ['#00f5d4', '#00bbf3', ...] (青色/蓝色渐变) |
| backgroundColor | '#1a1b26' (深灰黑) |
| textStyle.color | '#e0e0e0' (浅灰文字) |

### dashboard.js 图表示例
- Token 使用趋势（折线图）
- 今日 vs 本月用量对比（柱状图）

---

## CSS 主题配色 (common-tech-theme.css)

| 变量名 | 颜色值 | 用途 |
|--------|--------|------|
| --color-primary | #00f5d4 | 主色（青色） |
| --color-secondary | #00bbf3 | 辅色（蓝色） |
| --color-bg-dark | #1a1b26 | 深背景 |
| --color-card-bg | rgba(30,31,45,0.9) | 卡片背景 |
| --color-text-main | #e0e0e0 | 主文字 |

**设计特点**:
- 毛玻璃效果（backdrop-filter: blur）
- 渐变边框动画
- SVG Icon 描边风格

---

## 常见修改定位

| 问题类型 | 优先检查文件 |
|----------|--------------|
| 登录失效/Session 丢失 | common.js API.request() credentials 配置 |
| 菜单项未显示 | fragments/nav.html currentUserRole 变量传递 |
| 图表不渲染 | dashboard.js ECharts 初始化逻辑 / echarts-tech-theme.js |
| 响应式布局错乱 | common.css .layout-container flex 布局 |
| API 调用返回 401 | SecurityConfig CORS 配置 + Session 创建逻辑 |
