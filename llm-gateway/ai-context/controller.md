# Controller 层文档

## 概述
Controller 层负责接收 HTTP 请求，进行参数校验，调用 Service 层处理业务逻辑，返回响应结果。

## 文件清单

| 文件 | 路径 | 职责 |
|------|--|------|
| LlmController | `src/main/java/com/nexusai/llm/gateway/controller/LlmController.java` | LLM 请求转发核心入口 |
| AuthController | `src/main/java/com/nexusai/llm/gateway/controller/AuthController.java` | 用户登录/注册 |
| ApiKeyController | `src/main/java/com/nexusai/llm/gateway/controller/ApiKeyController.java` | API Key 增删改查 |
| UserController | `src/main/java/com/nexusai/llm/gateway/controller/UserController.java` | 用户日志查询、统计 |
| ClientController | `src/main/java/com/nexusai/llm/gateway/controller/ClientController.java` | 客户端 Token 查询 |
| AdminController | `src/main/java/com/nexusai/llm/gateway/controller/AdminController.java` | 管理员操作（用户管理、Key 管理、系统监控） |
| ViewController | `src/main/java/com/nexusai/llm/gateway/controller/ViewController.java` | 页面渲染（HTML 页面路由） |

---

## LlmController
**文件**: `src/main/java/com/nexusai/llm/gateway/controller/LlmController.java`

### 职责
LLM 请求转发的核心入口，处理客户端的 Chat 请求并转发到后端 LLM 服务。

### API 端点

| 方法 | 路径 | 描述 |
|------|--|------|
| POST | `/api/llm/chat` | 处理聊天请求，转发到后端 LLM |
| GET | `/api/llm/models` | 获取可用模型列表 |

### 依赖服务
- `LlmForwardService` - 转发请求到后端
- `ApiKeyService` - Token 配额检查
- `RequestLogService` - 日志记录
- `RoutingConfigParser` - 路由配置解析

### 关键方法
- `chat()` - 处理聊天请求，包含配额检查、路由解析、请求转发、Token 扣减
- `listModels()` - 返回支持的模型列表

### 调用链路（chat 请求）
1. 接收请求 → 2. 获取 ApiKey（从 request attribute）→ 3. 检查 Token 配额 → 4. 解析目标 URL 和模型 → 5. 转发请求 → 6. 记录日志 → 7. 扣减 Token → 8. 返回响应

---

## AuthController
**文件**: `src/main/java/com/nexusai/llm/gateway/controller/AuthController.java`

### 职责
处理用户认证相关操作。

### API 端点

| 方法 | 路径 | 描述 |
|------|--|------|
| POST | `/api/auth/login` | 用户登录（触发 Session 创建） |
| POST | `/api/auth/register` | 用户注册 |
| GET | `/api/auth/me` | 获取当前登录用户信息 |

### 依赖服务
- `AuthenticationManager` - Spring Security 认证管理器
- `UserRepository` - 用户数据访问
- `BCryptPasswordEncoder` - 密码加密

### 关键方法
- `login()` - 验证用户凭据，触发 Session 创建
- `register()` - 创建新用户
- `getCurrentUser(Authentication)` - 返回当前用户信息

### 调用链路（登录）
1. 接收登录请求 → 2. AuthenticationManager 验证 → 3. 从 UserRepository 获取用户 → 4. 创建 Session → 5. 返回成功消息

---

## ApiKeyController
**文件**: `src/main/java/com/nexusai/llm/gateway/controller/ApiKeyController.java`

### 职责
API Key 的 CRUD 操作，支持用户和管理员两种权限级别。

### API 端点

| 方法 | 路径 | 描述 |
|------|--|------|
| GET | `/api/admin/apikeys` | 获取 API Keys 列表 |
| POST | `/api/admin/apikeys` | 创建 API Key |
| DELETE | `/api/admin/apikeys/{id}` | 删除 API Key |
| PUT | `/api/admin/apikeys/{id}/toggle` | 启用/禁用 API Key |

### 依赖服务
- `ApiKeyService` - API Key 业务逻辑
- `ApiKeyRepository` - API Key 数据访问
- `JwtService` - JWT 处理（预留）

### 权限规则
- **USER**: 只能查看/操作自己的 API Key
- **ADMIN**: 可以查看所有用户的 API Key（通过 userId 参数过滤）

### 关键方法
- `listApiKeys()` - 根据角色返回不同范围的 API Keys
- `createApiKey()` - 创建新的 API Key
- `deleteApiKey()` - 删除 API Key（权限检查）
- `toggleApiKey()` - 切换 API Key 状态
- `getCurrentUserId()` - 支持 Session 和 API Key 两种认证方式获取用户 ID
- `isAdmin()` - 判断是否为管理员

---

## UserController
**文件**: `src/main/java/com/nexusai/llm/gateway/controller/UserController.java`

### 职责
提供用户级别的日志查询和统计信息。

### API 端点

| 方法 | 路径 | 描述 |
|------|--|------|
| GET | `/api/user/logs` | 分页查询用户日志（支持过滤） |
| GET | `/api/user/stats` | 获取用户统计数据 |

### 依赖服务
- `RequestLogRepository` - 日志数据访问
- `ApiKeyRepository` - API Key 统计

### 关键方法
- `getUserLogs()` - 支持日期、状态、API Key 过滤的分页查询
- `getUserStats()` - 返回今日/本月 Token 消耗、请求统计、成功率等
- `getCurrentUserId()` - 支持双重认证方式

### 请求参数（logs）
- `page` - 页码（默认 0）
- `size` - 每页大小（默认 20）
- `apiKeyId` - 按 API Key 过滤（可选）
- `startDate` - 开始日期（可选）
- `endDate` - 结束日期（可选）
- `status` - 状态过滤 SUCCESS/FAIL（可选）

---

## ClientController
**文件**: `src/main/java/com/nexusai/llm/gateway/controller/ClientController.java`

### 职责
提供客户端 Token 使用情况查询接口。

### API 端点

| 方法 | 路径 | 描述 |
|------|--|------|
| GET | `/api/clients/token-usage` | 查询 Token 使用情况 |

### 依赖服务
- `ApiKeyService` - 查找 API Key

### 认证方式
- 通过 `X-API-Key` 请求头传递 API Key

### 关键方法
- `getTokenUsage()` - 返回 Token 总量、已用、剩余

---

## AdminController
**文件**: `src/main/java/com/nexusai/llm/gateway/controller/AdminController.java`

### 职责
管理员专属操作，需要 `ROLE_ADMIN` 权限。

### API 端点

| 方法 | 路径 | 描述 |
|------|--|------|
| GET | `/api/admin/users` | 用户列表（分页，支持搜索） |
| PUT | `/api/admin/users/{id}/toggle` | 启用/禁用用户 |
| DELETE | `/api/admin/users/{id}` | 删除用户 |
| PUT | `/api/admin/keys/{id}` | 更新 API Key 配置 |
| POST | `/api/admin/keys/{id}/reset-usage` | 重置 API Key 使用量 |
| GET | `/api/admin/monitor` | 系统监控统计 |

### 依赖服务
- `UserRepository` - 用户数据访问
- `ApiKeyRepository` - API Key 数据访问
- `RequestLogRepository` - 日志数据统计

### 关键方法
- `listUsers()` - 分页查询用户（支持按用户名搜索）
- `toggleUser()` - 切换用户状态
- `deleteUser()` - 删除用户
- `updateKey()` - 更新 API Key 配置
- `resetKeyUsage()` - 重置 Token 使用量
- `getMonitorStats()` - 系统监控数据
- `toUserResponse()` - 用户实体转响应 DTO
- `toKeyResponse()` - API Key 实体转响应 DTO

---

## ViewController
**文件**: `src/main/java/com/nexusai/llm/gateway/controller/ViewController.java`

### 职责
处理 HTML 页面路由，返回 Thymeleaf 模板。

### 页面路由
| 路径 | 模板 | 描述 |
|------|------|------|
| `/login` | `pages/login.html` | 登录页面 |
| `/register` | `pages/register.html` | 注册页面 |
| `/dashboard` | `pages/dashboard/index.html` | 仪表盘页面 |
| `/logs` | `pages/logs/index.html` | 日志页面 |
| `/admin/users` | `pages/admin/users.html` | 用户管理页面 |
| `/admin/keys` | `pages/admin/keys.html` | API Key 管理页面 |
| `/admin/monitor` | `pages/admin/monitor.html` | 系统监控页面 |

---

## 修改定位指南

| 问题类型 | 优先查看文件 | 原因 |
|----------|-------------|------|
| API 端点 404 | 对应 Controller 的 `@RequestMapping` 配置 | 检查路径配置是否正确 |
| 参数校验失败 | Controller 的 `@Valid` 注解和 DTO 类 | 检查字段约束 |
| 权限 403 | Controller 的 `@PreAuthorize` 注解 | 检查角色要求 |
| 响应数据不对 | Controller 的响应构建逻辑 | 检查数据转换 |
| 添加新 API | 创建新 Controller 或扩展现有 Controller | 按功能模块划分 |
