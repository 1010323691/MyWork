# Controller 层说明

## 概述

Controller 层负责接收 HTTP 请求，进行参数校验、认证授权后调用 Service 层处理业务逻辑，最终返回响应结果。本项目采用 RESTful 设计风格，包含用户认证、API Key 管理、LLM 转发、系统监控等功能模块。

---

## 控制器清单

### 1. ViewController
**路径**: `controller/ViewController.java`  
**职责**: Thymeleaf 页面路由分发

| 方法 | 路径 | 说明 |
|------|------|------|
| dashboard | `/` (GET) | 仪表盘首页 |
| login | `/login` (GET) | 登录页面 |
| register | `/register` (GET) | 注册页面 |
| balance | `/balance` (GET) | 用户余额页面 |
| logs | `/logs` (GET) | 请求日志页面 |
| adminUsers | `/admin/users` (GET) | 管理员 - 用户管理页 |
| adminKeys | `/admin/keys` (GET) | 管理员-API Key 管理页 |
| adminProviders | `/admin/providers` (GET) | 管理员-Provider 配置页 |
| adminLogs | `/admin/logs` (GET) | 管理员 - 日志查询页 |

---

### 2. AuthController
**路径**: `controller/AuthController.java`  
**职责**: 用户认证与注册（Session/Cookie 模式）  
**路由前缀**: `/api/auth`

| 方法 | 路径 | HTTP | 说明 |
|------|------|------|------|
| login | `/login` | POST | 用户登录，创建 Session |
| register | `/register` | POST | 新用户注册 |
| getCurrentUser | `/me` | GET | 获取当前登录用户信息 |

**依赖 Service**: `AuthenticationManager`, `UserRepository`  
**响应 DTO**: `AuthResponse` (用于登录响应)

---

### 3. LlmController
**路径**: `controller/LlmController.java`  
**职责**: LLM API 转发核心接口（对外提供统一聊天入口）  
**路由前缀**: `/api/llm`

| 方法 | 路径 | HTTP | 说明 |
|------|------|------|------|
| chat | `/chat` | POST | LLM 聊天请求转发（含 Token 配额检查、请求记录） |
| listModels | `/models` | GET | 获取可用模型列表 |

**依赖 Service**: `LlmForwardService`, `ApiKeyService`, `RequestLogService`, `RoutingConfigParser`  
**认证方式**: API Key (通过 `ApiKeyAuthenticationFilter`)  
**请求 DTO**: `ChatRequest`  
**核心流程**:
1. 从 HTTP 请求属性获取已认证的 ApiKey 实体
2. 预估输入 Token 数量并检查配额
3. 解析目标 URL 和模型名称（支持路由配置）
4. 转发请求到上游 Provider
5. 异步记录日志与扣减 Token

### OpenAI 兼容流式接口补充
- `/v1/chat/completions` 使用 `StreamingResponseBody` 返回上游 SSE 流。
- 该接口依赖 MVC 异步请求支持；项目已显式配置更长的 async timeout 与专用线程池，避免长响应在 30 秒默认超时后被 Spring 提前关闭。

---

### 4. ApiKeyController
**路径**: `controller/ApiKeyController.java`  
**职责**: API Key 的创建、查询、删除、启用/禁用管理  
**路由前缀**: `/api/admin/apikeys`

| 方法 | 路径 | HTTP | 说明 |
|------|------|------|------|
| listApiKeys | `` (空) | GET | 获取 API Keys 列表（支持用户过滤） |
| createApiKey | `` (空) | POST | 创建新的 API Key |
| deleteApiKey | `/{id}` | DELETE | 删除指定 API Key |
| toggleApiKey | `/{id}/toggle` | PUT | 切换 API Key 启用/禁用状态 |

**权限控制**: 
- USER：仅可操作自己的 API Keys
- ADMIN：可查询任意用户的 API Keys（通过 userId 参数）

**依赖 Service**: `ApiKeyService`, `ApiKeyRepository`  
**请求 DTO**: `ApiKeyRequest`  
**响应 DTO**: `ApiKeyResponse`

---

### 5. UserController
**路径**: `controller/UserController.java`  
**职责**: 用户个人信息、日志查询、统计信息展示  
**路由前缀**: `/api/user`

| 方法 | 路径 | HTTP | 说明 |
|------|------|------|------|
| getUserLogs | `/logs` | GET | 分页查询用户的请求日志（支持多条件过滤） |
| getLogDetail | `/logs/{id}` | GET | 获取单条日志详情 |
| listMyApiKeys | `/apikeys` | GET | 获取当前用户的 API Keys 列表（不暴露 Key 值） |
| getUserStats | `/stats` | GET | 用户统计数据（今日/本月 Token、成功率等） |

**依赖 Repository**: `RequestLogRepository`, `ApiKeyRepository`  
**响应 DTO**: `RequestLogResponse`, `UserStatsResponse`, `DailyTokenStat`  
**认证方式**: Session 或 API Key 双模式支持

---

### 6. UserBalanceController
**路径**: `controller/UserBalanceController.java`  
**职责**: 用户余额查询与管理（充值/扣款）  
**路由前缀**: `/api/balance`

| 方法 | 路径 | HTTP | 说明 |
|------|------|------|------|
| getCurrentBalance | `/current` | GET | 获取当前用户余额 |
| getUserBalance | `/user/{userId}` | GET | 管理员查询指定用户余额 |
| adjustBalance | `/admin/user/{userId}` | PUT | 管理员调整用户余额（需 ADMIN 角色） |
| estimateCost | `/estimate` | POST | 估算请求成本 |

**依赖 Service**: `UserBalanceService`  
**权限控制**: 余额调整需要 ADMIN 角色 (`@PreAuthorize("hasRole('ADMIN')")`)  
**内部类**: `BalanceResponse`, `BalanceAdjustmentRequest`, `CostEstimateRequest`, `EstimateCostResponse`

---

### 7. AdminController
**路径**: `controller/AdminController.java`  
**职责**: 管理员通用操作（用户管理、API Key 管理、系统监控）  
**路由前缀**: `/api/admin`  
**权限要求**: 全部方法需 ADMIN 角色 (`@PreAuthorize("hasRole('ADMIN')")`)

| 分组 | 方法 | 路径 | HTTP | 说明 |
|------|------|------|------|------|
| **用户管理** | listUsers | `/users` | GET | 分页查询所有用户（支持用户名过滤） |
| **用户管理** | toggleUser | `/users/{id}/toggle` | PUT | 启用/禁用用户账号 |
| **用户管理** | deleteUser | `/users/{id}` | DELETE | 删除指定用户 |
| **Key 管理** | updateKey | `/keys/{id}` | PUT | 更新 API Key 配置（Token 限额、目标 URL 等） |
| **Key 管理** | resetKeyUsage | `/keys/{id}/reset-usage` | POST | 重置 API Key 已用 Token |
| **系统监控** | getMonitorStats | `/monitor` | GET | 获取系统运行状态（请求数、CPU/内存/GPU） |

**依赖 Repository**: `UserRepository`, `ApiKeyRepository`, `RequestLogRepository`  
**依赖 Service**: `SystemService`  
**响应 DTO**: `AdminUserResponse`, `ApiKeyResponse`, `SystemMonitorResponse`

---

### 8. AdminProviderController
**路径**: `controller/AdminProviderController.java`  
**职责**: 上游 Provider（后端服务）配置管理  
**路由前缀**: `/api/admin/providers`  
**权限要求**: ADMIN 角色 (`@PreAuthorize("hasRole('ADMIN')")`)

| 方法 | 路径 | HTTP | 说明 |
|------|------|------|------|
| listProviders | `` (空) | GET | 获取所有上游 Provider 列表 |
| getProvider | `/{id}` | GET | 获取单个 Provider 详情 |
| createProvider | `` (空) | POST | 创建新的 Provider |
| updateProvider | `/{id}` | PUT | 更新 Provider 配置 |
| deleteProvider | `/{id}` | DELETE | 删除指定 Provider |
| toggleProviderEnabled | `/{id}/enabled` | PATCH | 切换 Provider 启用状态 |
| resetCircuit | `/{id}/reset-circuit` | POST | 重置 Provider 熔断计数 |

**依赖 Service**: `UpstreamProviderService`  
**实体类**: `BackendService`  
**响应 DTO**: `ProviderDTO` (不包含敏感字段如 API Key)  
**内部类**: `EnableRequest`

---

### 9. AdminLogController
**路径**: `controller/AdminLogController.java`  
**职责**: 管理员日志查询（全量访问）  
**路由前缀**: `/api/admin/logs`  
**权限要求**: ADMIN 角色 (`@PreAuthorize("hasRole('ADMIN')")`)

| 方法 | 路径 | HTTP | 说明 |
|------|------|------|------|
| listLogs | `` (空) | GET | 分页查询所有请求日志（支持多条件过滤） |
| getLogDetail | `/{id}` | GET | 获取单条日志详情 |

**依赖 Repository**: `RequestLogRepository`  
**响应 DTO**: `RequestLogResponse`  
**过滤参数**: apiKeyId, startDate, endDate, status

---

### 10. ClientController
**路径**: `controller/ClientController.java`  
**职责**: 客户端辅助接口（预留扩展）

---

## Controller 层核心设计模式

| 模式 | 说明 |
|------|------|
| **依赖注入** | Service 通过构造函数注入，保证可测试性 |
| **权限控制** | 使用 `@PreAuthorize("hasRole('ADMIN')")` 进行方法级授权 |
| **双认证支持** | UserController、ApiController 等方法同时支持 Session 和 API Key 认证 |
| **分页查询** | 使用 Spring Data JPA 的 Pageable 接口，统一分页参数处理 |
| **事务管理** | 写操作默认开启 `@Transactional`，读操作显式标记 `readOnly = true` |

---

## 常见修改定位

| 问题类型 | 优先检查文件 |
|----------|--------------|
| API 路由未生效 | 对应 Controller 的 `@RequestMapping` 配置 |
| 权限校验失败 | `@PreAuthorize` 注解与 SecurityConfig 配置 |
| Token 配额错误 | LlmController.chat() → ApiKeyService.hasEnoughTokens() |
| 页面渲染异常 | ViewController 的路径映射与 Thymeleaf 模板对应关系 |
| 日志查询不全 | UserController.getUserLogs() / AdminLogController.listLogs() 的 Specification 条件构建 |

---

## 路由总览（按前缀分组）

```
/ (根路径)         → ViewController → Thymeleaf 页面渲染
/api/auth/*       → AuthController → 用户登录/注册
/api/user/*       → UserController → 用户信息/日志查询
/api/balance/*    → UserBalanceController → 余额管理
/api/admin/*      → AdminController → 管理员通用操作
/api/admin/apikeys → ApiKeyController → API Key CRUD
/api/admin/logs   → AdminLogController → 全量日志查询
/api/admin/providers → AdminProviderController → Provider 配置
/api/llm/*        → LlmController → LLM 转发核心接口（需 API Key）
```
