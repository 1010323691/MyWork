# Controller 层文档（控制器）

## 模块职责

处理 HTTP 请求和响应，包含认证检查、参数验证、调用 Service 层逻辑。采用 RESTful 风格设计。

---

## 控制器列表

### 1. AuthController (认证控制器)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/controller/AuthController.java`

| 端点 | 方法 | 说明 | 权限要求 |
|------|------|------|----------|
| `/api/auth/login` | POST | 用户登录（返回 Session） | 公开 |
| `/api/auth/register` | POST | 新用户注册 | 公开 |
| `/api/auth/me` | GET | 获取当前登录用户信息 | 需认证 |

**请求/响应 DTO**:
- `AuthRequest`: 登录请求（username, password）
- `RegisterRequest`: 注册请求（username, password, email）

---

### 2. LlmController (LLM 转发控制器) ⭐核心

**文件路径**: `src/main/java/com/nexusai/llm/gateway/controller/LlmController.java`

| 端点 | 方法 | 说明 | 权限要求 |
|------|------|------|----------|
| `/api/llm/chat` | POST | LLM 聊天请求转发 | API Key |
| `/api/llm/models` | GET | 获取可用模型列表 | API Key |

**核心流程**:
1. `ApiKeyAuthenticationFilter` 验证 API Key，存入 request attribute
2. 预估输入 Token 并检查配额
3. 解析路由配置（targetUrl + model）
4. 调用 `LlmForwardService.forwardChatRequest()` 转发请求
5. 异步扣减 Token (`RequestLogService.asyncRecordUsage`)
6. 异步记录请求日志 (`RequestLogService.asyncLogRequest`)

---

### 3. ApiKeyController (API Key 管理控制器)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/controller/ApiKeyController.java`

| 端点 | 方法 | 说明 | 权限要求 |
|------|------|------|----------|
| `/api/admin/apikeys` | GET | 获取 API Keys 列表 | 认证用户 |
| `/api/admin/apikeys` | POST | 创建新的 API Key | 认证用户 |
| `/api/admin/apikeys/{id}` | DELETE | 删除 API Key | 认证用户（仅自己的或 ADMIN） |
| `/api/admin/apikeys/{id}/toggle` | PUT | 启用/禁用 API Key | 认证用户（仅自己的或 ADMIN） |

**权限说明**:
- USER: 只能查看和管理自己的 API Keys
- ADMIN: 可查看所有用户的 API Keys，通过 `?userId=xxx` 参数过滤

---

### 4. UserController (用户功能控制器)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/controller/UserController.java`

| 端点 | 方法 | 说明 | 权限要求 |
|------|------|------|----------|
| `/api/user/logs` | GET | 查询用户请求日志（分页 + 过滤） | 认证用户 |
| `/api/user/logs/{id}` | GET | 获取指定日志详情 | 认证用户（仅自己的） |
| `/api/user/stats` | GET | 获取用户统计数据 | 认证用户 |

**查询参数**:
- `logs`: page, size, apiKeyId, startDate, endDate, status

---

### 5. AdminController (管理员控制器)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/controller/AdminController.java`

| 端点 | 方法 | 说明 | 权限要求 |
|------|------|------|----------|
| `/api/admin/users` | GET | 获取用户列表 | ADMIN |
| `/api/admin/users/{id}/toggle` | PUT | 启用/禁用用户账号 | ADMIN |

---

### 6. AdminLogController (日志查询控制器)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/controller/AdminLogController.java`

| 端点 | 方法 | 说明 | 权限要求 |
|------|------|------|----------|
| `/api/admin/logs` | GET | 管理员查询所有请求日志 | ADMIN |
| `/api/admin/logs/{id}` | GET | 获取指定日志详情 | ADMIN |

---

### 7. AdminProviderController (后端服务管理)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/controller/AdminProviderController.java`

| 端点 | 方法 | 说明 | 权限要求 |
|------|------|------|----------|
| `/api/admin/providers` | GET | 获取后端服务列表 | ADMIN |
| `/api/admin/providers` | POST | 创建后端服务 | ADMIN |
| `/api/admin/providers/{id}` | PUT | 更新后端服务配置 | ADMIN |
| `/api/admin/providers/{id}` | DELETE | 删除后端服务 | ADMIN |

---

### 8. ClientController (客户端转发)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/controller/ClientController.java`

提供 OpenAI 兼容的 API 端点，供客户端调用。

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/clients/openai/v1/chat/completions` | POST | OpenAI 格式聊天接口 |
| `/api/clients/openai/v1/models` | GET | OpenAI 格式模型列表 |

---

### 9. ViewController (页面视图控制器)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/controller/ViewController.java`

渲染 HTML 页面（Thymeleaf 模板）：
- `/` → 首页重定向到 /login
- `/login` → 登录页
- `/register` → 注册页
- `/dashboard` → Dashboard（需认证）
- `/logs` → 日志查询页（需认证）
- `/admin/*` → 管理员页面（需 ADMIN）

---

## 修改指引

| 需求 | 修改文件 |
|------|----------|
| 新增 API 端点 | 在对应 Controller 添加 `@RequestMapping` |
| 修改权限控制 | 检查 SecurityConfig + Controller 注解 |
| 调整响应格式 | 修改对应的 DTO 类 |
| 添加请求参数验证 | 使用 `@Valid` + JSR-303 校验注解 |
