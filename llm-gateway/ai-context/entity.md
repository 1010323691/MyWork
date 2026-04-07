# Entity 和 DTO 层 - 数据模型

## 模块概览
JPA 实体类和数据传输对象（DTO）。

---

## Entity 实体类

### 1. `User.java`
**表**: `users`
**实现接口**: `UserDetails` (Spring Security)

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | Long | 主键 |
| username | String | 用户名（唯一） |
| password | String | 密码（BCrypt 加密） |
| email | String | 邮箱（唯一） |
| enabled | Boolean | 是否启用 |
| userRole | String | 角色（USER/ADMIN，数据库列名 user_role） |
| apiKeys | List<ApiKey> | 一对多关联 |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |

**关键方法**:
- `getAuthorities()` - 返回角色权限
- `getUsername()` / `getPassword()` - Spring Security 接口实现

---

### 2. `ApiKey.java`
**表**: `api_keys`

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | Long | 主键 |
| user | User | 多对一关联 |
| apiKeyValue | String | API Key 值（唯一，格式 nkey_XXX，数据库列名 api_key） |
| name | String | 名称 |
| tokenLimit | Long | Token 配额（null=无限制） |
| usedTokens | Long | 已使用 Token 数 |
| enabled | Boolean | 是否启用 |
| expiresAt | LocalDateTime | 过期时间（null=永不过期） |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |

**关键方法**:
- `getRemainingTokens()` - 计算剩余 Token
- `useTokens(count)` - 增加使用量

---

### 3. `BackendService.java`
**表**: `backend_services`

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | Long | 主键 |
| name | String | 服务名称 |
| baseUrl | String | 后端服务 URL |
| serviceType | ServiceType | 类型（OLLAMA/VLLM） |
| enabled | Boolean | 是否启用 |
| timeoutSeconds | Integer | 超时时间（秒） |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |

**枚举**: `ServiceType { OLLAMA, VLLM }`

---

## DTO 数据传输对象

### 1. `AuthRequest.java`
**用途**: 登录/注册请求

| 字段 | 类型 | 说明 |
|-----|------|-----|
| username | String | 用户名 |
| password | String | 密码 |

---

### 2. `AuthResponse.java`
**用途**: 登录响应（JWT Token）

| 字段 | 类型 | 说明 |
|-----|------|-----|
| token | String | JWT Token |
| username | String | 用户名 |
| email | String | 邮箱 |
| expiresIn | Long | 过期时间（秒） |

---

### 3. `ApiKeyRequest.java`
**用途**: 创建 API Key 请求

| 字段 | 类型 | 说明 |
|-----|------|-----|
| name | String | API Key 名称 |
| tokenLimit | Long | Token 配额 |
| expiresAtDays | Long | 过期天数 |

---

### 4. `ApiKeyResponse.java`
**用途**: API Key 信息响应

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | Long | ID |
| key | String | API Key（实际字段名 apiKeyValue，JSON 序列化为 key） |
| name | String | 名称 |
| tokenLimit | Long | 配额 |
| usedTokens | Long | 已使用 |
| remainingTokens | Long | 剩余 |
| enabled | Boolean | 启用状态 |
| expiresAt | LocalDateTime | 过期时间 |
| createdAt | LocalDateTime | 创建时间 |

---

### 5. `TokenUsageResponse.java`
**用途**: Token 余量查询响应

| 字段 | 类型 | 说明 |
|-----|------|-----|
| totalTokens | Long | 总配额 |
| usedTokens | Long | 已使用 |
| remainingTokens | Long | 剩余 |
| apiKeyName | String | API Key 名称 |
| hasLimit | Boolean | 是否有配额限制 |

---

### 6. `ChatRequest.java`
**用途**: LLM 聊天请求

| 字段 | 类型 | 说明 |
|-----|------|-----|
| model | String | 模型名称 |
| messages | String | 消息 JSON 字符串 |
| stream | Boolean | 是否流式 |
| backendUrl | String | 后端服务 URL |

---

## 数据流转

```
请求 → DTO (AuthRequest/ChatRequest)
    ↓
Controller 处理
    ↓
Service 业务逻辑
    ↓
Repository 数据库访问
    ↓
Entity (User/ApiKey)
    ↓
响应 → DTO (AuthResponse/ApiKeyResponse)
```

---

## 修改影响

| 修改文件 | 影响范围 |
|---------|--------|
| User | 用户登录、权限控制 |
| ApiKey | 所有 API Key 相关功能 |
| BackendService | 后端服务配置 |
| AuthRequest/Response | 登录注册接口 |
| ApiKeyRequest/Response | API Key 管理接口 |
| ChatRequest | LLM 聊天请求 |
| TokenUsageResponse | Token 查询接口 |

---

## 注意事项

1. **User 实现 UserDetails**: 直接用于 Spring Security 认证
2. **Lombok 注解**: 所有 Entity 和 DTO 都使用 `@Data`、`@Builder` 等注解
3. **实体关联**: User 和 ApiKey 是一对多关系，User 端有级联删除
4. **时间自动更新**: 所有实体都有 `@PrePersist` 和 `@PreUpdate` 回调
