# UI Layer - Frontend Architecture

## 概述
前端采用 Thymeleaf 服务端渲染 + 原生 JavaScript，无构建工具，直接通过静态资源提供服务。

## 技术栈
- **模板引擎**: Thymeleaf (服务端渲染)
- **样式**: CSS3 + 自定义主题 (科技蓝风格)
- **脚本**: 原生 JavaScript (ES6+)
- **图表**: ECharts (数据可视化)
- **认证**: Session/Cookie (无 JWT)

## 文件结构

`
src/main/resources/
├── static/                    # 静态资源
│   ├── css/
│   │   ├── common.css         # 全局基础样式
│   │   ├── common-tech-theme.css  # 科技主题配色
│   │   ├── login.css          # 登录页样式
│   │   ├── dashboard.css      # 仪表板样式
│   │   ├── admin.css          # 管理后台样式
│   │   └── logs.css           # 日志页样式
│   └── js/
│       ├── common.js          # 核心工具类 (API/UI/FormValidation)
│       ├── login.js           # 登录逻辑
│       ├── register.js        # 注册逻辑
│       ├── dashboard.js       # 仪表板逻辑
│       ├── logs.js            # 日志查询逻辑
│       ├── admin-*.js         # 管理功能 (用户/密钥/服务商)
│       └── echarts-tech-theme.js  # ECharts 主题配置
└── templates/                 # Thymeleaf 模板
    ├── layout/
    │   └── base.html          # 基础布局模板
    ├── fragments/             # 可复用片段
    │   ├── head.html          # <head> 公共部分
    │   ├── nav.html           # 导航栏
    │   ├── sidebar.html       # 侧边栏
    │   ├── scripts.html       # 公共脚本引入
    │   ├── alerts.html        # 提示信息容器
    │   ├── form.html          # 表单组件
    │   ├── card.html          # 卡片组件
    │   ├── modal.html         # 模态框组件
    │   ├── stats-card.html    # 统计卡片组件
    │   └── user-profile.html  # 用户头像下拉
    └── pages/                 # 页面模板
        ├── login.html         # 登录页
        ├── register.html      # 注册页
        ├── dashboard/
        │   └── index.html     # 仪表板主页
        ├── logs/
        │   └── index.html     # 请求日志页
        ├── user/
        │   └── balance.html   # 用户余额充值
        └── admin/             # 管理后台页面
            ├── users.html     # 用户管理
            ├── keys.html      # API Key 管理
            ├── providers.html # 服务商管理
            ├── pricing.html   # 定价配置
            └── monitor.html   # 系统监控
`

## 核心 JavaScript 模块

### 1. API 类 (HTTP 客户端)
**文件**: common.js - API class
- **职责**: 封装所有 HTTP 请求，自动处理 Session/Cookie 认证
- **关键方法**:
  - isAuthenticated() - 检查用户是否登录（调用 /api/auth/me）
  - getCurrentUser() - 获取当前用户信息
  - equest(endpoint, options) - 统一请求入口
  - get/post/put/delete(endpoint) - HTTP 方法封装
- **特性**:
  - 自动携带 Cookie (credentials: 'same-origin')
  - 401/403 自动跳转到登录页
  - 30 秒超时控制
  - JSON 自动解析

### 2. UI 类 (界面交互)
**文件**: common.js - UI class
- **职责**: 提供通用 UI 组件和交互方法
- **关键方法**:
  - showAlert(message, type) - 显示 Toast 提示（success/error/warning/info）
  - showSuccessMessage(message) - 成功提示
  - showErrorMessage(message) - 错误提示
  - copyToClipboard(text) - 复制到剪贴板
  - ormatNumber(num) - 数字千分位格式化
  - ormatDate(dateString) - 日期格式化
  - switchTab(tabId) - 切换标签页
  - confirm(message, callback) - 确认对话框
  - debounce(func, wait) - 防抖函数

### 3. FormValidation 类 (表单验证)
**文件**: common.js - FormValidation class
- **职责**: 客户端表单字段验证
- **关键方法**:
  - equired(value, fieldName) - 非空验证
  - email(value) - 邮箱格式验证
  - minLength(value, min, fieldName) - 最小长度验证
  - 
umber(value, fieldName) - 数字类型验证
  - minValue(value, min, fieldName) - 最小值验证

## Thymeleaf 模板架构

### 基础布局 (base.html)
**文件**: layout/base.html
- **结构**: 
  `html
  <th:block th:fragment="layout(pageTitle, content, extraCss)">
    - sidebar (侧边栏)
    - main.main-content
      - alerts (提示信息)
      - content (页面内容，通过 th:replace 注入)
  </th:block>
  `
- **用法**: <th:block th:replace="~{layout/base :: layout('标题', ~{pages/xxx}, '/css/xxx.css')}">

### 可复用片段 (fragments/)
| 文件 | 用途 |
|------|------|
| head.html | <head> 公共部分（meta、title、CSS 引用） |
| nav.html | 顶部导航栏（用户头像下拉菜单） |
| sidebar.html | 侧边栏菜单（根据角色显示不同项） |
| scripts.html | 公共 JS 引入 (common.js + ECharts) |
| alerts.html | Spring Security 提示信息容器 |
| form.html | 表单组件（输入框、按钮、错误提示） |
| card.html | 卡片容器组件 |
| modal.html | 模态框组件 |
| stats-card.html | 统计数字卡片 |
| user-profile.html | 用户头像与下拉菜单 |

## 页面路由映射

### 公开页面 (无需认证)
- /login - pages/login.html → login.js
- /register - pages/register.html → egister.js

### 用户页面 (USER/ADMIN)
| URL | 模板文件 | JS 文件 | 说明 |
|-----|----------|--------|------|
| /dashboard | pages/dashboard/index.html | dashboard.js | 仪表板主页 |
| /logs | pages/logs/index.html | logs.js | 请求日志查询 |
| /user/balance | pages/user/balance.html | - | 余额充值 |

### 管理页面 (仅 ADMIN)
| URL | 模板文件 | JS 文件 | 说明 |
|-----|----------|--------|------|
| /admin/users | pages/admin/users.html | admin-users.js | 用户管理 CRUD |
| /admin/keys | pages/admin/keys.html | admin-keys.js | API Key 管理 |
| /admin/providers | pages/admin/providers.html | admin-providers.js | 后端服务商管理 |
| /admin/pricing | pages/admin/pricing.html | admin-pricing.js | Token 定价配置 |
| /admin/monitor | pages/admin/monitor.html | admin-monitor.js | 系统实时监控 |

## 前端与后端 API 对应关系

### 认证相关
`javascript
// login.js
API.post('/auth/login', { username, password })  -> AuthController.login()
API.post('/auth/register', {...})                -> AuthController.register()
API.get('/auth/me')                              -> AuthController.getCurrentUser()
`

### Dashboard
`javascript
// dashboard.js
API.get('/dashboard/summary')                    -> DashboardController.getSummary()
API.get('/dashboard/stats/users')                -> DashboardController.getUserStats()
API.get('/dashboard/stats/tokens?start=...&end=...') -> DashboardController.getTokenUsageTrend()
API.get('/dashboard/system/monitor')             -> DashboardController.getSystemMonitor()
`

### API Key 管理
`javascript
// admin-keys.js (管理员查看所有)
API.get('/apikeys')                              -> ApiKeyController.findAll()
API.post('/apikeys', {...})                      -> ApiKeyController.create()
API.put('/apikeys/' + id, {...})                 -> ApiKeyController.update()
API.delete('/apikeys/' + id)                     -> ApiKeyController.delete()
`

### 用户管理 (管理员)
`javascript
// admin-users.js
API.get('/admin/users')                          -> AdminController.findAllUsers()
API.put('/admin/users/' + id, {...})             -> AdminController.updateUser()
API.delete('/admin/users/' + id)                 -> AdminController.deleteUser()
API.post('/admin/users/' + id + '/enable')       -> AdminController.toggleEnable()
`

### 服务商管理 (管理员)
`javascript
// admin-providers.js
API.get('/admin/providers')                      -> AdminProviderController.findAll()
API.post('/admin/providers', {...})              -> AdminProviderController.create()
API.put('/admin/providers/' + id, {...})         -> AdminProviderController.update()
API.delete('/admin/providers/' + id)             -> AdminProviderController.delete()
API.post('/admin/providers/' + id + '/connectivity-test') -> testConnectivity()
`

### 请求日志 (管理员)
`javascript
// logs.js
API.get('/admin/logs?page=...&size=...&userId=...&status=...') -> AdminLogController.searchLogs()
`

## CSS 主题系统

### 配色方案 (common-tech-theme.css)
- **主色调**: #1a1a2e (深蓝黑背景)
- **强调色**: #00d4ff (科技蓝)
- **辅助色**: #ee3d5c (粉红)、#f7b731 (橙黄)
- **文字**: #eaeaea (浅灰白)

### 响应式设计
- 使用 Flexbox + Grid 布局
- 侧边栏可折叠（移动端适配）
- 表格横向滚动（小屏幕）

## 状态管理
- **无集中式状态管理** (如 Redux/Vuex)
- **Session 驱动**: 用户登录状态由后端 Session 维护
- **本地缓存**: currentUser 变量缓存在 JS 中，减少请求
- **页面间通信**: URL 参数 + Session

## 修改指南

### 新增页面
1. 创建模板文件：	emplates/pages/xxx/index.html
2. 使用基础布局：	h:replace="~{layout/base :: layout(...)}"
3. 创建 JS 文件：static/js/xxx.js
4. 在 scripts.html 或页面中引入 JS
5. 添加路由映射（ViewController 或直接访问模板）

### 新增组件
1. 创建片段文件：	emplates/fragments/component-name.html
2. 定义 th:fragment，如 <th:block th:fragment="componentName(params)"
3. 在其他页面引用：	h:replace="~{fragments/component-name :: componentName(...)}"

### 修改样式
1. 全局样式：修改 common.css
2. 主题配色：修改 common-tech-theme.css
3. 页面专用：创建/修改对应 CSS 文件

### 新增 API 调用
1. 在 API 类中添加方法（如需要特殊处理）
2. 直接使用 API.get/post/put/delete()
3. 错误处理由 UI.showErrorMessage() 统一展示
