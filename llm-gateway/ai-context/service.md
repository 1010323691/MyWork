# Service 层文档（服务层）

## 模块职责

实现核心业务逻辑，包括 Token 配额管理、请求转发、日志记录、路由配置解析等。Service 层被 Controller 层调用，并依赖 Repository 层进行数据持久化。

---

## 服务类列表

### 1. LlmForwardService (LLM 转发服务) ⭐核心

**文件路径**: `src/main/java/com/nexusai/llm/gateway/service/LlmForwardService.java`

**职责**: 将用户的聊天请求转发到后端 OLLAMA/VLLM 服务

**主要方法**:
```java
// 转发聊天请求（支持流式和非流式）
String forwardChatRequest(String backendUrl, String model, String messages, boolean stream)

// 非流式转发
String forwardNonStreaming(String url, Map<String, Object> body)

// 流式转发（SSE）
String forwardStreaming(String url, Map<String, Object> body)

// Token 使用估算
long estimateTokenUsage(String content)
```

**Token 估算逻辑**:
- 英文字符：1 token ≈ 4 个字符
- 中文字符：1 token ≈ 1.5 个字符

---

### 2. RequestLogService (请求日志服务) ⭐核心

**文件路径**: `src/main/java/com/nexusai/llm/gateway/service/RequestLogService.java`

**职责**: 异步记录请求日志和 Token 使用量

**主要方法**:
```java
// 异步记录请求详情（@Async）
void asyncLogRequest(Long apiKeyId, Long inputTokens, Long outputTokens, 
                     String modelName, Long latencyMs, RequestStatus status,
                     String requestBody, String responseBody)

// 异步扣减 Token（@Async）  
void asyncRecordUsage(Long apiKeyId, long totalTokens)
```

**注意事项**:
- 使用 `@Async` 保证不影响主请求响应速度
- 使用 `@Transactional` 确保数据库操作原子性
- requestBody/responseBody 截断至 2000 字符，避免存储过大

---

### 3. ApiKeyService (API Key 服务)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/security/ApiKeyService.java`

**职责**: API Key 的创建、查找和配额验证

**主要方法**:
```java
// 根据 Key 值查找（可用于缓存）
Optional<ApiKey> findByKey(String apiKeyValue)

// 绕过缓存直接查询
Optional<ApiKey> findByKeyNoCache(String apiKeyValue)

// 创建新的 API Key
@Transactional
ApiKey createApiKey(Long userId, String name, Long tokenLimit, 
                    Long expiresAtDays, String targetUrl, String routingConfig)

// 检查 Token 是否充足
boolean hasEnoughTokens(ApiKey apiKey, long requiredTokens)

// 记录 Token 使用
@Transactional  
void recordUsage(ApiKey apiKey, long tokensUsed)
```

**API Key 生成规则**: `nkey_` + Base64 编码的 32 字节随机数

---

### 4. RoutingConfigParser (路由配置解析器)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/service/RoutingConfigParser.java`

**职责**: 解析 API Key 的路由配置，决定请求转发目标和模型映射

**主要方法**:
```java
// 解析目标 URL（支持路由配置或默认值）
String resolveTargetUrl(String routingConfig, String defaultTargetUrl)

// 解析模型名（支持模型映射）
String resolveModel(String routingConfig, String requestModel)
```

---

### 5. UpstreamProviderService (上游提供商服务)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/service/UpstreamProviderService.java`

**职责**: 管理后端服务提供商的创建和配置

---

## Service 调用关系图

```
Controller Layer          →      Service Layer           →     Repository Layer
────────────────────────         ──────────────          ──────────────────
LlmController             →       LlmForwardService     →     BackendServiceRepository
                           ↓
                   RoutingConfigParser
                           ↓
                  RequestLogService    →     ApiKeyRepository
                                          RequestLogRepository

ApiKeyController          →       ApiKeyService         →     ApiKeyRepository

UserController            →       UserRepository        →     User 相关统计方法
                        ↓                       RequestLogRepository
                   (直接查询)                  
```

---

## 修改指引

| 需求 | 修改文件 |
|------|----------|
| 修改 Token 估算逻辑 | `LlmForwardService.estimateTokenUsage()` |
| 增加日志记录字段 | `RequestLogService.asyncLogRequest()` + RequestLog entity |
| 调整 Token 扣减策略 | `ApiKeyService.hasEnoughTokens()` / `asyncRecordUsage()` |
| 新增路由规则 | `RoutingConfigParser` |
