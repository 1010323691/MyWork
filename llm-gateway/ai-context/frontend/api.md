# 前端 API 模块

## 核心 API 类

### API 类 (`common.js`)

| 方法 | 说明 |
|--|--|
| `API.isAuthenticated()` | 检查用户登录状态 |
| `API.getCurrentUser()` | 获取当前用户信息 |
| `API.get(endpoint)` | GET 请求 |
| `API.post(endpoint, data)` | POST 请求 |
| `API.put(endpoint, data)` | PUT 请求 |
| `API.delete(endpoint)` | DELETE 请求 |

**认证方式**: Session/Cookie (`credentials: 'same-origin'`)

---

## 页面 API 调用映射

### 登录 (`login.js`)
| 操作 | API 端点 | 方法 |
|--|--|--|
| 登录 | `/api/auth/login` | POST |
| 检查登录 | `/api/auth/me` | GET |

### 仪表盘 (`dashboard.js`)
| 操作 | API 端点 | 方法 |
|--|--|--|
| 获取汇总数据 | `/api/dashboard/summary` | GET |

### 用户注册 (`register.js`)
| 操作 | API 端点 | 方法 |
|--|--|--|
| 注册 | `/api/auth/register` | POST |

### API Key 管理 (`admin-keys.js`)
| 操作 | API 端点 | 方法 |
|--|--|--|
| 列表 | `/api/apikeys` | GET |
| 创建 | `/api/apikeys` | POST |
| 删除 | `/api/apikeys/{id}` | DELETE |
| 启用/禁用 | `/api/apikeys/{id}/toggle` | PUT |

### 日志查询 (`logs.js`)
| 操作 | API 端点 | 方法 |
|--|--|--|
| 列表 | `/api/admin/logs` | GET |
| 详情 | `/api/admin/logs/{id}` | GET |

### 提供商管理 (`admin-providers.js`)
| 操作 | API 端点 | 方法 |
|--|--|--|
| 列表 | `/api/admin/providers` | GET |
| 详情 | `/api/admin/providers/{id}` | GET |
| 创建 | `/api/admin/providers` | POST |
| 更新 | `/api/admin/providers/{id}` | PUT |
| 删除 | `/api/admin/providers/{id}` | DELETE |
| 测试连接 | `/api/admin/providers/test-connectivity` | POST |
| 发现模型 | `/api/admin/providers/discover-models` | POST |
| 重置熔断器 | `/api/admin/providers/{id}/reset-circuit` | POST |

### 系统监控 (`admin-monitor.js`)
| 操作 | API 端点 | 方法 |
|--|--|--|
| 获取监控数据 | `/api/admin/monitor` | GET |

### 余额管理 (`user-balance.js`)
| 操作 | API 端点 | 方法 |
|--|--|--|
| 当前余额 | `/api/user/balance/current` | GET |
| 交易记录 | `/api/user/balance/transactions` | GET |

---

## UI 工具类 (`common.js`)

| 方法 | 说明 |
|--|--|
| `UI.showErrorMessage(msg)` | 显示错误提示 |
| `UI.showSuccessMessage(msg)` | 显示成功提示 |
| `UI.showAlert(msg, type)` | 显示提示（success/error/warning/info） |
| `UI.copyToClipboard(text)` | 复制到剪贴板 |
| `UI.formatNumber(num)` | 数字格式化（千分位） |
| `UI.formatMoney(value)` | 金额格式化 |
| `UI.formatDate(dateString)` | 日期格式化 |
| `UI.confirm(msg, callback)` | 确认对话框 |
| `UI.debounce(func, wait)` | 防抖函数 |

---

## 事件处理模式

```javascript
// 页面加载
document.addEventListener('DOMContentLoaded', async function() {
    // 1. 检查登录
    if (!(await API.isAuthenticated())) {
        window.location.href = '/login';
        return;
    }
    
    // 2. 加载数据
    await loadData();
    
    // 3. 绑定事件
    bindEvents();
});

// 表单提交
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    // 验证 → 调用 API → 处理响应
});
```

---

## 错误处理

- **401/403**: 自动跳转到登录页
- **超时**: 显示"请求超时，请重试"
- **全局错误**: `window.addEventListener('error')` 捕获
