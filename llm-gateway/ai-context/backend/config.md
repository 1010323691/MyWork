# 后端 Config 模块

## 配置类

### WebMvcAsyncConfig
异步请求和流式响应配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| gateway.async.request-timeout-ms | 300000 | 异步请求超时 (ms) |
| gateway.async.executor-core-pool-size | 8 | 线程池核心数 |
| gateway.async.executor-max-pool-size | 32 | 线程池最大数 |
| gateway.async.executor-queue-capacity | 200 | 队列容量 |

**Bean**:
- `streamingTaskExecutor`: 流式响应专用线程池，线程名前缀 `streaming-`

---

### SecurityProtectionProperties
安全限流配置 (`@ConfigurationProperties(prefix = "app.security.protection")`)

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| app.security.protection.enabled | true | 启用安全保护 |
| app.security.protection.login.ipMaxRequests | 5 | 登录 IP 最大请求数 |
| app.security.protection.login.ipWindowMinutes | 1 | 登录 IP 窗口 (分钟) |
| app.security.protection.login.failure.maxAttempts | 5 | 登录失败最大尝试 |
| app.security.protection.login.failure.windowMinutes | 10 | 登录失败窗口 (分钟) |
| app.security.protection.login.failure.lockMinutes | 15 | 登录失败锁定时间 (分钟) |
| app.security.protection.register.ipMaxRequests | 2 | 注册 IP 最大请求数 |
| app.security.protection.register.ipWindowMinutes | 10 | 注册 IP 窗口 (分钟) |
| app.security.protection.write.maxRequests | 60 | 写操作最大请求数 |
| app.security.protection.write.windowMinutes | 1 | 写操作窗口 (分钟) |
| app.security.protection.completion.maxRequests | 60 | 完成接口最大请求数 |
| app.security.protection.completion.windowMinutes | 1 | 完成接口窗口 (分钟) |

---

## SecurityConfig
Spring Security 配置

**注解**:
- `@EnableWebSecurity`: 启用 Web 安全
- `@EnableMethodSecurity`: 启用方法级安全
- `@EnableConfigurationProperties(SecurityProtectionProperties.class)`: 启用安全保护配置

### 认证流程

1. **GatewayRequestLoggingFilter**: 请求日志记录 (最先)
2. **ApiKeyAuthenticationFilter**: API Key 认证
3. **SecurityProtectionFilter**: 安全限流保护

### 安全过滤器链

```
SecurityFilterChain
├── CORS 配置 (corsConfigurationSource)
├── CSRF 禁用
├── Session 管理 (IF_REQUIRED)
├── 表单登录禁用
├── 退出登录 (/logout)
├── GatewayRequestLoggingFilter
├── ApiKeyAuthenticationFilter
└── SecurityProtectionFilter
```

### 授权规则

| 路径 | 权限 |
|------|------|
| /api/auth/login, /api/auth/register | 公开 |
| /api/auth/me | 认证 |
| /actuator/health, /actuator/info | 公开 |
| /actuator/** | ADMIN |
| /, /login, /register | 公开 |
| /static/**, /css/**, /js/**, /images/**, /fonts/** | 公开 |
| /api/chat, /api/llm/chat | 公开 |
| /api/models, /api/llm/models | 公开 |
| /v1/chat/completions, /v1/messages, /v1/models | 公开 |
| /api/apikeys/** | 认证 |
| /api/admin/** | ADMIN |
| /api/user/** | 认证 |
| /api/clients/** | 认证 |
| /api/llm/** | 认证 |
| /v1/** | 认证 |
| /api/** | 认证 |
| /dashboard, /models, /apikeys, /logs | 认证 |
| /admin/** | ADMIN |

### CORS 配置

| 配置项 | 值 |
|--------|-----|
| allowedOriginPatterns | ${app.security.allowed-origin-patterns} |
| allowedMethods | GET, POST, PUT, PATCH, DELETE, OPTIONS |
| allowedHeaders | Authorization, Content-Type, X-API-Key, X-Requested-With, anthropic-version, anthropic-beta, x-api-key |
| exposedHeaders | X-Remaining-Tokens, X-Total-Tokens |
| allowCredentials | true |
| maxAge | 3600s |

### Bean 定义

- **PasswordEncoder**: BCryptPasswordEncoder
- **AuthenticationManager**: 从 AuthenticationConfiguration 获取

---

## ApiKeyAuthenticationFilter
API Key 认证过滤器

**职责**: 从请求头提取 API Key，验证有效性，设置 SecurityContext

### API Key 提取顺序

1. `/v1/messages`: `Authorization: Bearer <token>`
2. `X-API-Key` header
3. `x-api-key` header (小写)
4. `Authorization: Bearer <token>` (其他路径)

### 认证状态 (Request 属性)

| 状态值 | 说明 |
|--------|------|
| missing | 缺少 API Key |
| provided_but_rejected | 提供了但验证失败 |
| authenticated_but_disabled | 认证通过但已禁用 |
| authenticated_but_expired | 认证通过但已过期 |
| authenticated | 认证成功 |

### Skip 路径 (可配置)

```
/api/auth/**
/actuator/health
/actuator/info
/favicon.ico
/css/**
/js/**
/images/**
/fonts/**
/login
/register
/
```

---

## SecurityProtectionFilter
安全限流过滤器

**职责**: 登录限流、注册限流、写操作限流、完成接口限流

### 限流分类

| 类别 | 适用路径 | 限流键 |
|------|----------|--------|
| login-ip | POST /api/auth/login | IP 地址 |
| register-ip | POST /api/auth/register | IP 地址 |
| completion | POST /v1/chat/completions, /v1/messages, /api/llm/chat | ApiKey/User/IP |
| write | POST/PUT/PATCH/DELETE /api/**, /v1/** | ApiKey/User/IP |

### 限流主体解析优先级

1. ApiKey (`request.getAttribute("apiKey")`)
2. SecurityContext Authentication
3. Client IP

### 响应

```json
{
  "error": "Too many requests",
  "status": 429,
  "retryAfterSeconds": 30
}
```

Headers: `Retry-After: 30`

---

## GatewayRequestLoggingFilter
网关请求日志过滤器

**职责**: 拦截 LLM 请求，记录关键信息到日志

### 拦截路径

- `/api/llm/chat`
- `/api/chat`
- `/v1/chat/completions`
- `/v1/messages`

### 日志格式

```
gateway_chat_request_received | requestUrl=<URL> | targetUrl=<目标 URL> | model=<模型> | keyAuthStatus=<认证状态> | responseStatus=<状态码>
```

### 目标 URL 解析逻辑

1. `/api/llm/chat` 或 `/api/chat`: 使用 `RoutingConfigParser.resolveTargetUrl()`
2. 其他路径: 使用 `RoutingConfigParser.resolveConfiguredTargetUrl()` 或 `UpstreamProviderService.findByModelName()`

### 请求内容缓存

使用 `ContentCachingRequestWrapper` 缓存请求体，用于提取 model 字段
