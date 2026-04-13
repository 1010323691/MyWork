# 前端 UI 模块

## 页面结构

### 布局模板
| 文件 | 职责 |
|------|------|
| `templates/layout/base.html` | 全局基础布局（导航栏、页脚） |
| `templates/fragments/` | 可复用片段（导航、卡片、表单） |

### 核心页面
| 文件 | 职责 | 对应 JS |
|------|------|--------|
| `templates/pages/login.html` | 用户登录 | `static/js/login.js` |
| `templates/pages/register.html` | 用户注册 | `static/js/register.js` |
| `templates/pages/dashboard/index.html` | 仪表盘 | `static/js/dashboard.js` |
| `templates/pages/models/index.html` | 模型目录 | `static/js/models.js` |
| `templates/pages/logs/index.html` | 请求日志 | `static/js/logs.js` |
| `templates/pages/admin/users.html` | 用户管理 | `static/js/admin-users.js` |
| `templates/pages/admin/keys.html` | API Key 管理 | `static/js/admin-keys.js` |
| `templates/pages/admin/providers.html` | 提供商管理 | `static/js/admin-providers.js` |
| `templates/pages/admin/monitor.html` | 系统监控 | `static/js/admin-monitor.js` |
| `templates/pages/user/balance.html` | 余额管理 | `static/js/user-balance.js` |

---

## 样式结构

| 文件 | 职责 |
|------|------|
| `static/css/common.css` | 全局公共样式 |
| `static/css/login.css` | 登录/注册页面 |
| `static/css/dashboard.css` | 仪表盘样式 |
| `static/css/admin.css` | 管理员页面 |
| `static/css/logs.css` | 日志页面 |
| `static/css/models.css` | 模型目录样式 |

---

## 组件依赖关系

```
base.html
├── fragments/nav.html (导航栏)
├── fragments/sidebar.html (侧边栏)
├── fragments/cards.html (卡片组件)
└── fragments/pagination.html (分页组件)
```

---

## UI 修改定位

| 问题类型 | 检查文件 |
|----------|--------|
| 导航栏异常 | `templates/fragments/nav.html` |
| 页面布局错乱 | `templates/layout/base.html` + 对应 CSS |
| 表单验证失败 | 对应页面 HTML + 对应 JS |
| 弹窗不显示 | 对应 JS 的模态框逻辑 |
| 表格无数据 | 对应 JS 的数据加载逻辑 |
