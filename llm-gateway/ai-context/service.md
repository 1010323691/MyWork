# Service 层 - 业务逻辑

## 模块概览
业务逻辑处理层，包含核心业务逻辑和对外部服务的调用。

## 文件清单

### 1. `LlmForwardService.java`
**职责**: LLM 请求转发到后端服务（Ollama/vLLM）

**核心方法**:

| 方法 | 说明 |
|-----|-----|
| `forwardChatRequest(backendUrl, model, messages, stream)` | 转发聊天请求 |
| `forwardNonStreaming(url, body)` | 非流式转发 |
| `forwardStreaming(url, body)` | 流式转发（SSE） |
| `parseMessages(messages)` | 解析消息 JSON 格式 |
| `estimateTokenUsage(content)` | 估算 Token 使用量 |

**技术细节**:
- 使用 `WebClient` (Reactor Netty) 进行 HTTP 请求
- 支持流式和非流式两种转发模式
- 超时时间：300 秒
- 最大内存大小：16MB

**依赖**: `BackendServiceRepository`, `ObjectMapper`, `WebClient`

---

### 2. `JwtService.java`
**职责**: JWT Token 生成和验证

**核心方法**:

| 方法 | 说明 |
|-----|-----|
| `generateToken(userDetails)` | 生成 JWT Token |
| `generateToken(claims, userDetails)` | 生成带自定义 claim 的 Token |
| `extractUsername(token)` | 从 Token 中提取用户名 |
| `isTokenValid(token, userDetails)` | 验证 Token 有效性 |

**配置**:
- JWT 密钥：`jwt.secret`（生产环境必须修改）
- 过期时间：`jwt.expiration`（默认 24 小时）

**依赖**: `io.jsonwebtoken` (JJWT)

---

### 3. `ApiKeyService.java`
**职责**: API Key 生成、验证和管理

**核心方法**:

| 方法 | 说明 |
|-----|-----|
| `findByKey(key)` | 通过 Key 查找 API Key |
| `findByKeyNoCache(key)` | 直接查库，不经过缓存 |
| `createApiKey(userId, name, tokenLimit, expiresAtDays)` | 创建新 API Key |
| `generateKey()` | 生成安全的 API Key（格式：nkey_XXX） |
| `hasEnoughTokens(apiKey, requiredTokens)` | 检查 Token 余额 |
| `recordUsage(apiKey, tokensUsed)` | 记录 Token 使用 |

**依赖**: `ApiKeyRepository`

---

### 4. `CustomUserDetailsService.java` (实现 UserDetailsService)
**职责**: Spring Security 用户详情加载

**核心方法**:

| 方法 | 说明 |
|-----|-----|
| `loadUserByUsername(username)` | 从数据库加载用户信息 |

**依赖**: `UserRepository`

---

## 调用关系

```
LlmController.chat()
    ↓
LlmForwardService.forwardChatRequest()
    ↓
  ├─ buildChatApiUrl() → 构建后端 URL
  ├─ parseMessages() → 解析消息
  └─ forwardNonStreaming() / forwardStreaming() → WebClient 请求
        ↓
    后端 LLM 服务 (Ollama/vLLM)

AuthController.login()
    ↓
JwtService.generateToken()
    ↓
返回 JWT Token

ApiKeyController.listApiKeys()
    ↓
ApiKeyService.findByKey()
    ↓
ApiKeyRepository.findByUserId()
```

---

## 修改影响

| 修改文件 | 影响范围 |
|---------|--------|
| LlmForwardService | 所有 LLM 转发请求，流式/非流式 |
| JwtService | 所有 JWT 认证相关功能 |
| ApiKeyService | API Key 生成、验证、使用记录 |
| CustomUserDetailsService | 用户登录认证 |

---

## 注意事项

1. **LlmForwardService.forwardStreaming()**: 流式转发的数据处理存在异步问题，当前实现将流数据合并到 StringBuilder，需关注内存占用
2. **JwtService**: 生产环境必须修改 `jwt.secret` 默认值
3. **ApiKeyService.generateKey()**: 使用 SecureRandom 生成 32 字节随机数，Base64 编码
