# API 映射文档

## 概述
本文档描述前端 API 调用与后端 Controller 端点的完整映射关系，便于理解数据流和定位问题。

---

## 认证模块

### login.js
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 登录 | API.post('/api/auth/login', data) | AuthController.login() | /api/auth/login | POST |
| 检查登录 | API.get('/api/auth/me') | AuthController.getMe() | /api/auth/me | GET |

### register.js
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 注册 | API.post('/api/auth/register', data) | AuthController.register() | /api/auth/register | POST |

---

## 仪表盘模块

### dashboard.js
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 获取汇总数据 | API.get('/api/dashboard/summary') | DashboardController.getSummary() | /api/dashboard/summary | GET |

---

## API Key 管理

### admin-keys.js (管理员)
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 列表 | API.get('/api/admin/keys') | AdminController.getKeys() | /api/admin/keys | GET |
| 详情 | API.get('/api/admin/keys/' + id) | AdminController.getKey() | /api/admin/keys/{id} | GET |
| 更新配置 | API.put('/api/admin/keys/' + id, data) | AdminController.updateKey() | /api/admin/keys/{id} | PUT |
| 删除 | API.delete('/api/admin/keys/' + id) | AdminController.deleteKey() | /api/admin/keys/{id} | DELETE |

### ApiKeyController (用户)
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 列表 | API.get('/api/apikeys') | ApiKeyController.list() | /api/apikeys | GET |
| 创建 | API.post('/api/apikeys', {name}) | ApiKeyController.create() | /api/apikeys | POST |
| 删除 | API.delete('/api/apikeys/' + id) | ApiKeyController.delete() | /api/apikeys/{id} | DELETE |
| 启用/禁用 | API.put('/api/apikeys/' + id + '/toggle') | ApiKeyController.toggle() | /api/apikeys/{id}/toggle | PUT |

---

## 日志查询

### logs.js (管理员)
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 列表 | API.get('/api/admin/logs') | AdminLogController.list() | /api/admin/logs | GET |
| 详情 | API.get('/api/admin/logs/' + id) | AdminLogController.get() | /api/admin/logs/{id} | GET |

### UserController (用户)
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 列表 | API.get('/api/user/logs') | UserController.getLogs() | /api/user/logs | GET |
| 详情 | API.get('/api/user/logs/' + id) | UserController.getLog() | /api/user/logs/{id} | GET |
| 统计 | API.get('/api/user/stats') | UserController.getStats() | /api/user/stats | GET |

---

## 提供商管理

### admin-providers.js
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 列表 | API.get('/api/admin/providers') | AdminProviderController.list() | /api/admin/providers | GET |
| 详情 | API.get('/api/admin/providers/' + id) | AdminProviderController.get() | /api/admin/providers/{id} | GET |
| 创建 | API.post('/api/admin/providers', data) | AdminProviderController.create() | /api/admin/providers | POST |
| 更新 | API.put('/api/admin/providers/' + id, data) | AdminProviderController.update() | /api/admin/providers/{id} | PUT |
| 删除 | API.delete('/api/admin/providers/' + id) | AdminProviderController.delete() | /api/admin/providers/{id} | DELETE |
| 测试连接 | API.post('/api/admin/providers/test-connectivity', data) | AdminProviderController.testConnectivity() | /api/admin/providers/test-connectivity | POST |
| 发现模型 | API.post('/api/admin/providers/discover-models', {providerId}) | AdminProviderController.discoverModels() | /api/admin/providers/discover-models | POST |
| 重置熔断器 | API.post('/api/admin/providers/' + id + '/reset-circuit') | AdminProviderController.resetCircuit() | /api/admin/providers/{id}/reset-circuit | POST |

---

## 用户管理

### admin-users.js
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 列表 | API.get('/api/admin/users') | AdminController.listUsers() | /api/admin/users | GET |
| 详情 | API.get('/api/admin/users/' + id) | AdminController.getUser() | /api/admin/users/{id} | GET |
| 启用/禁用 | API.put('/api/admin/users/' + id + '/toggle') | AdminController.toggleUser() | /api/admin/users/{id}/toggle | PUT |
| 删除 | API.delete('/api/admin/users/' + id) | AdminController.deleteUser() | /api/admin/users/{id} | DELETE |

---

## 余额管理

### user-balance.js
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 当前余额 | API.get('/api/balance/current') | UserBalanceController.getCurrent() | /api/balance/current | GET |
| 交易记录 | API.get('/api/balance/transactions') | UserBalanceController.getTransactions() | /api/balance/transactions | GET |
| 估算成本 | API.post('/api/balance/estimate', data) | UserBalanceController.estimate() | /api/balance/estimate | POST |

### AdminController (管理员调整余额)
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 调整余额 | API.put('/api/balance/admin/user/' + userId, data) | AdminController.adjustBalance() | /api/balance/admin/user/{userId} | PUT |

---

## 系统监控

### admin-monitor.js
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 监控数据 | API.get('/api/admin/monitor') | AdminController.getMonitor() | /api/admin/monitor | GET |

---

## 模型目录

### models.js
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| 模型目录 | API.get('/api/models/catalog') | ModelCatalogController.getCatalog() | /api/models/catalog | GET |

---

## Token 查询

### ClientController
| 操作 | API 调用 | 后端 Controller | 端点 | 方法 |
|------|--------|---------------|------|------|
| Token 使用量 | API.get('/api/clients/token-usage') | ClientController.getTokenUsage() | /api/clients/token-usage | GET |

---

## LLM 转发核心

### LlmController
| 操作 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 聊天 | /api/llm/chat | POST | 非流式聊天 |
| 聊天 | /api/chat | POST | 非流式聊天 (别名) |
| 模型列表 | /api/llm/models | GET | 模型列表 |
| 模型列表 | /api/models | GET | 模型列表 (别名) |

### OpenAiCompatibleController
| 操作 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 聊天完成 | /v1/chat/completions | POST | OpenAI 兼容 (支持流式) |
| 模型列表 | /v1/models | GET | OpenAI 兼容模型列表 |

### AnthropicCompatibleController
| 操作 | 端点 | 方法 | 说明 |
|------|------|------|------|
| 消息 | /v1/messages | POST | Anthropic 兼容 (支持流式) |

---

## 页面路由 (ViewController)

| 页面 | 端点 | 权限 | 对应 JS |
|------|------|------|--------|
| 登录 | /login | 公开 | login.js |
| 注册 | /register | 公开 | register.js |
| 仪表盘 | /dashboard | 认证 | dashboard.js |
| API Key 管理 | /apikeys | 认证 | - |
| 模型目录 | /models | 认证 | models.js |
| 请求日志 | /logs | 认证 | logs.js |
| 用户管理 | /admin/users | ADMIN | admin-users.js |
| Key 管理 | /admin/keys | ADMIN | admin-keys.js |
| 提供商管理 | /admin/providers | ADMIN | admin-providers.js |
| 系统监控 | /admin/monitor | ADMIN | admin-monitor.js |
| 余额页面 | /user/balance | 认证 | user-balance.js |

---

## API 调用完整流程

### 典型请求流程

```
前端 JS (login.js)
    ↓ API.post('/api/auth/login')
    ↓ fetch('/api/auth/login', {method: 'POST', ...})
    ↓ Spring Security 过滤器链
        ├── GatewayRequestLoggingFilter (跳过认证端点)
        ├── ApiKeyAuthenticationFilter (跳过认证端点)
        └── SecurityProtectionFilter (登录限流)
    ↓ AuthController.login()
        ↓ UserService.authenticate()
            ↓ UserRepository.findByUsername()
            ↓ BCryptPasswordEncoder.matches()
        ↓ SecurityContextHolder.setAuthentication()
    ↓ {success: true}
    ↓ 前端处理响应，跳转页面
```

### LLM 请求完整流程

```
前端 SDK 调用
    ↓ POST /v1/chat/completions
    ↓ Security 过滤器链
        ├── GatewayRequestLoggingFilter (记录请求)
        ├── ApiKeyAuthenticationFilter (验证 API Key)
            └── ApiKeyService.findByKey()
        └── SecurityProtectionFilter (限流检查)
    ↓ OpenAiCompatibleController.chatCompletions()
        ↓ RoutingConfigParser.resolveTargetUrl()
        ↓ RoutingConfigParser.resolveModel()
        ↓ UpstreamProviderService.findByModelName()
        ↓ UserBillingService.hasEnoughBalance()
        ↓ LlmForwardService.forwardChatRequest()
            ↓ WebClient.post().retrieve()
        ↓ UserBillingService.settleUsage()
        ↓ RequestLogService.asyncLogRequest()
    ↓ 响应流式返回
```
