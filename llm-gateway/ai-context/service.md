# Service 层文档

## 概述
Service 层封装核心业务逻辑，包括请求转发、Token 管理、日志记录、路由配置解析等。

## 文件清单

| 文件 | 路径 | 职责 |
|------|------|------|
| LlmForwardService | `src/main/java/com/nexusai/llm/gateway/service/LlmForwardService.java` | LLM 请求转发（核心） |
| RequestLogService | `src/main/java/com/nexusai/llm/gateway/service/RequestLogService.java` | 请求日志记录与 Token 扣减 |
| RoutingConfigParser | `src/main/java/com/nexusai/llm/gateway/service/RoutingConfigParser.java` | 路由配置解析（组件） |
| ApiKeyService | `src/main/java/com/nexusai/llm/gateway/security/ApiKeyService.java` | API Key 业务逻辑 |
| CustomUserDetailsService | `src/main/java/com/nexusai/llm/gateway/security/CustomUserDetailsService.java` | 用户认证服务 |
| JwtService | `src/main/java/com/nexusai/llm/gateway/security/JwtService.java` | JWT Token 服务（预留） |

---

## LlmForwardService
**文件**: `src/main/java/com/nexusai/llm/gateway/service/LlmForwardService.java`

### 职责
LLM 请求转发的核心服务，负责将客户端请求转发到配置的后端 LLM 服务。

### 依赖
- `BackendServiceRepository` - 后端服务配置
- `ObjectMapper` - JSON 处理
- `WebClient` - HTTP 客户端（Reactor）

### 关键方法

| 方法 | 描述 |
|------|------|
| `forwardChatRequest(String backendUrl, String model, String messages, boolean stream)` | 转发聊天请求，支持流式和非流式 |
| `forwardNonStreaming(String url, Map<String, Object> body)` | 非流式请求转发 |
| `forwardStreaming(String url, Map<String, Object> body)` | 流式请求转发 |
| `estimateTokenUsage(String content)` | Token 用量估算 |
| `parseMessages(String messages)` | 解析消息格式 |
| `buildChatApiUrl(String backendUrl)` | 构建后端 API URL |

### Token 估算逻辑
```
英文字符：1 token ≈ 4 个字符
中文字符：1 token ≈ 1.5 个字符
```

### 流式请求处理
- 使用 WebClient 的 Flux 进行流式处理
- 将流式数据拼接成 JSON 格式返回
- 包含同步锁防止并发修改 StringBuilder

### 超时配置
- 默认超时：300 秒

---

## RequestLogService
**文件**: `src/main/java/com/nexusai/llm/gateway/service/RequestLogService.java`

### 职责
异步记录请求日志和 Token 使用量，避免阻塞主请求流程。

### 依赖
- `RequestLogRepository` - 日志数据持久化
- `ApiKeyRepository` - Token 扣减

### 关键方法

| 方法 | 描述 |
|------|------|
| `asyncLogRequest(Long apiKeyId, Long inputTokens, Long outputTokens, String modelName, Long latencyMs, RequestStatus status, String requestBody, String responseBody)` | 异步记录请求日志 |
| `asyncRecordUsage(Long apiKeyId, long totalTokens)` | 异步记录 Token 使用量 |
| `truncate(String s)` | 截断日志内容（最大 2000 字符） |

### 异步处理
- 使用 `@Async` 注解实现异步处理
- 使用 `@Transactional` 保证事务一致性
- 异常被捕获并记录，不影响主流程

---

## RoutingConfigParser
**文件**: `src/main/java/com/nexusai/llm/gateway/service/RoutingConfigParser.java`

### 职责
解析 API Key 的路由配置，支持模型映射和动态后端 URL。

### 关键方法

| 方法 | 描述 |
|------|------|
| `resolveModel(String routingConfig, String requestedModel)` | 解析模型映射 |
| `resolveTargetUrl(String routingConfig, String apiKeyTargetUrl)` | 解析目标 URL |

### 路由配置优先级
1. **最高**: `routingConfig.targetUrl` (请求级别)
2. **中等**: `apiKey.targetUrl` (API Key 级别)
3. **最低**: 默认值 `http://localhost:11434`

### 模型映射示例
```json
{
  "modelMappings": {
    "gpt-4": "llama3",
    "claude": "qwen"
  }
}
```

---

## ApiKeyService
**文件**: `src/main/java/com/nexusai/llm/gateway/security/ApiKeyService.java`

### 职责
API Key 的创建、查找和 Token 管理。

### 依赖
- `ApiKeyRepository` - API Key 数据访问

### 关键方法

| 方法 | 描述 |
|------|------|
| `findByKey(String apiKeyValue)` | 根据 Key 查找 |
| `findByKeyNoCache(String apiKeyValue)` | 直接查询（无缓存） |
| `createApiKey(Long userId, String name, Long tokenLimit, Long expiresAtDays, String targetUrl, String routingConfig)` | 创建 API Key |
| `hasEnoughTokens(ApiKey apiKey, long requiredTokens)` | 检查 Token 是否充足 |
| `recordUsage(ApiKey apiKey, long tokensUsed)` | 记录 Token 使用 |
| `generateKey()` | 生成随机 API Key |

### API Key 格式
- 前缀：`nkey_`
- 主体：32 字节随机数的 Base64 URL 编码

### Token 检查逻辑
- 如果 `tokenLimit == null`，表示无限制，返回 true
- 否则检查 `remainingTokens >= requiredTokens`

---

## CustomUserDetailsService
**文件**: `src/main/java/com/nexusai/llm/gateway/security/CustomUserDetailsService.java`

### 职责
Spring Security 的用户详情服务，用于 Session 认证。

### 依赖
- `UserRepository` - 用户数据访问

### 关键方法

| 方法 | 描述 |
|------|------|
| `loadUserByUsername(String username)` | 根据用户名加载用户 |

### 返回类型
- 返回 `User` 实体（实现了 `UserDetails` 接口）
- `User` 实体自动提供 `getAuthorities()` 等方法

---

## 调用链路示例

### LLM Chat 请求完整链路
```
1. LlmController.chat()
   ↓ (检查配额)
2. ApiKeyService.hasEnoughTokens()
   ↓ (解析路由)
3. RoutingConfigParser.resolveTargetUrl()
   RoutingConfigParser.resolveModel()
   ↓ (转发请求)
4. LlmForwardService.forwardChatRequest()
   ↓ (估算输出 Token)
5. LlmForwardService.estimateTokenUsage()
   ↓ (异步记录)
6. RequestLogService.asyncLogRequest() (异步)
   RequestLogService.asyncRecordUsage() (异步)
   ↓
7. 返回响应
```

### 用户登录完整链路
```
1. AuthController.login()
   ↓ (认证)
2. AuthenticationManager.authenticate()
   ↓ (加载用户)
3. CustomUserDetailsService.loadUserByUsername()
   ↓ (密码验证)
4. BCryptPasswordEncoder.matches()
   ↓ (创建 Session)
5. Spring Security Session Management
   ↓
6. 返回成功
```

---

## 修改定位指南

| 问题类型 | 优先查看文件 | 关键方法 |
|----------|-------------|---------|
| Token 计算不准 | LlmForwardService | `estimateTokenUsage()` |
| 转发失败 | LlmForwardService | `forwardChatRequest()` |
| 路由不生效 | RoutingConfigParser | `resolveTargetUrl()`, `resolveModel()` |
| 日志未记录 | RequestLogService | `asyncLogRequest()` |
| Token 未扣减 | RequestLogService | `asyncRecordUsage()` |
| API Key 创建失败 | ApiKeyService | `createApiKey()` |
| 用户认证失败 | CustomUserDetailsService | `loadUserByUsername()` |
