# Controller 层 - API 接口

## 模块概览
Spring MVC 控制器层，处理 HTTP 请求并返回响应。

## 文件清单

### 1. `AuthController.java` `/api/auth`
**职责**: 用户认证（登录/注册）

| 方法 | 路径 | 说明 |
|-----|------|-----|
| `login()` | POST /api/auth/login | 用户登录，返回 JWT Token |
| `register()` | POST /api/auth/register | 用户注册 |

**依赖**: `AuthenticationManager`, `JwtService`, `UserRepository`, `BCryptPasswordEncoder`

---

### 2. `ApiKeyController.java` `/api/admin/apikeys`
**职责**: API Key 的 CRUD 管理（基于角色的权限控制）

| 方法 | 路径 | 说明 |
|-----|------|-----|
| `listApiKeys()` | GET /api/admin/apikeys | 获取 API Keys 列表 |
| `createApiKey()` | POST /api/admin/apikeys | 创建新 API Key |
| `deleteApiKey()` | DELETE /api/admin/apikeys/{id} | 删除 API Key |
| `toggleApiKey()` | PUT /api/admin/apikeys/{id}/toggle | 启用/禁用 API Key |

**权限规则**:
- **ADMIN**: 可管理所有用户的 API Keys
- **USER**: 只能管理自己的 API Keys

**依赖**: `ApiKeyService`, `ApiKeyRepository`

---

### 3. `LlmController.java` `/api/llm`
**职责**: LLM 请求转发（需 API Key 认证）

| 方法 | 路径 | 说明 |
|-----|------|-----|
| `chat()` | POST /api/llm/chat | 转发聊天请求到后端 LLM 服务 |
| `listModels()` | GET /api/llm/models | 返回支持的模型列表 |

**认证**: 通过 `X-API-Key` header 认证

**依赖**: `LlmForwardService`, `ApiKeyService`

---

### 4. `ClientController.java` `/api/clients`
**职责**: 客户端查询接口（需 API Key 认证）

| 方法 | 路径 | 说明 |
|-----|------|-----|
| `getTokenUsage()` | GET /api/clients/token-usage | 查询 Token 余量 |

**认证**: 通过 `X-API-Key` header 认证

**依赖**: `ApiKeyService`

---

### 5. `ViewController.java` `/`
**职责**: 页面路由（Thymeleaf 模板渲染）

| 方法 | 路径 | 说明 |
|-----|------|-----|
| `loginPage()` | GET /login | 返回登录页面 |
| `dashboardPage()` | GET /dashboard | 返回管理后台页面 |
| `home()` | GET / | 重定向到 /login |

**依赖**: 无（纯视图控制器）

---

## 调用关系图

```
用户请求
    ↓
[ViewController] → Thymeleaf 模板 → 返回 HTML 页面
    ↓
[AuthController] → AuthenticationManager → JwtService → 返回 JWT
    ↓
[ApiKeyController] → ApiKeyService → ApiKeyRepository → 操作数据库
    ↓
[LlmController] → LlmForwardService → 转发到 Ollama/vLLM
    ↓
[ClientController] → ApiKeyService → 返回 Token 使用统计
```

---

## 修改影响

| 修改文件 | 影响范围 |
|---------|--------|
| AuthController | 登录注册功能，JWT Token 生成 |
| ApiKeyController | API Key 管理权限逻辑 |
| LlmController | LLM 转发认证和请求处理 |
| ClientController | Token 余量查询接口 |
| ViewController | 页面路由和跳转 |

---

## 关键函数索引

- `AuthController.login()` - 用户登录，生成 JWT
- `ApiKeyController.listApiKeys()` - 带权限过滤的列表查询
- `LlmController.chat()` - 核心转发接口
- `ClientController.getTokenUsage()` - 客户端 Token 查询
- `ViewController.dashboardPage()` - 管理后台入口
