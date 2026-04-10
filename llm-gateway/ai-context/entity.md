# Entity 层说明

## 概述

Entity 层定义 JPA 实体类，映射数据库表结构。使用 Lombok 简化 getter/setter/toString 等方法生成。所有实体均包含创建时间和更新时间的自动填充逻辑（@PrePersist/@PreUpdate）。

---

## 实体清单

### 1. User
**路径**: `entity/User.java`  
**表名**: users  
**职责**: 用户账户核心信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键，自增 |
| username | String(50) | 用户名，唯一且非空 |
| password | String | 密码（BCrypt 加密） |
| email | String | 邮箱地址，非空 |
| enabled | Boolean | 账户启用状态，默认 true |
| userRole | String(20) | 角色：USER / ADMIN，默认 USER |
| balance | BigDecimal(18,4) | 用户余额（人民币） |
| version | Long | 乐观锁版本号 (@Version) |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |
| apiKeys | List<ApiKey> | 关联的 API Keys（@OneToMany，双向） |

**接口实现**: `UserDetails` (Spring Security)  
**关联关系**: `@OneToMany(mappedBy = "user", cascade = ALL, orphanRemoval = true)` → ApiKey

---

### 2. ApiKey
**路径**: `entity/ApiKey.java`  
**表名**: api_keys  
**职责**: API Key 配置与配额管理

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键，自增 |
| user | User | 所属用户（@ManyToOne, LAZY） |
| apiKeyValue | String | Key 值本身，唯一非空 |
| name | String | Key 名称/描述，非空 |
| tokenLimit | Long | Token 配额上限，null 表示无限制 |
| usedTokens | Long | 已使用 Token 数，默认 0 |
| inputTokens | Long | 输入 Token 累计统计 |
| outputTokens | Long | 输出 Token 累计统计 |
| enabled | Boolean | 启用状态，默认 true |
| expiresAt | LocalDateTime | 过期时间 |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |
| targetUrl | String | 目标后端 URL |
| routingConfig | TEXT | 路由配置 JSON（modelMappings/targetUrl） |
| lastUsedAt | LocalDateTime | 最后使用时间 |

**关联关系**: `@ManyToOne(fetch = LAZY)` → User  
**业务方法**:
- getRemainingTokens()：计算剩余 Token
- useTokens(count)：增加已用 Token

---

### 3. RequestLog
**路径**: `entity/RequestLog.java`  
**表名**: request_logs  
**职责**: LLM 请求日志记录（审计与统计）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键，自增 |
| apiKey | ApiKey | 关联的 API Key（@ManyToOne, LAZY） |
| requestId | String(64) | 请求追踪 ID |
| userId | Long | 用户 ID（冗余字段，优化查询） |
| inputTokens | Long | 输入 Token 数 |
| outputTokens | Long | 输出 Token 数 |
| modelName | String | 使用的模型名称 |
| latencyMs | Long | 响应延迟（毫秒） |
| costAmount | BigDecimal(18,4) | 消耗金额（人民币） |
| status | RequestStatus | 请求状态：SUCCESS / FAIL |
| createdAt | LocalDateTime | 创建时间 |

**索引**:
- idx_request_logs_api_key_id (api_key_id)
- idx_request_logs_created_at (created_at)
- idx_request_log_user_id (user_id)
- idx_request_log_request_id (request_id)

**枚举类型**: `RequestStatus { SUCCESS, FAIL }`

**日志策略补充**:
- 不再持久化请求体和响应体，避免大文本长期占用存储空间。
- `userId` 以 API Key 实际绑定的用户为准写入冗余字段。
- OpenAI 兼容流式响应优先读取上游 `usage.completion_tokens` 作为 `outputTokens`，只有缺失时才回退为内容估算。

---

### 4. BackendService
**路径**: `entity/BackendService.java`  
**表名**: backend_services  
**职责**: 上游 Provider（后端服务）配置

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键，自增 |
| name | String | Provider 名称，非空 |
| baseUrl | String | 基础 URL，非空 |
| serviceType | ServiceType | 服务类型：OLLAMA / VLLM，默认 OLLAMA |
| enabled | Boolean | 启用状态，默认 true |
| timeoutSeconds | Integer | 超时时间（秒），默认 300 |
| upstreamKey | String(512) | 上游 API Key（敏感字段） |
| buyPriceInput | BigDecimal(18,6) | 输入 Token 买入价（元/百万 Token） |
| sellPriceInput | BigDecimal(18,6) | 输入 Token 卖出价 |
| buyPriceOutput | BigDecimal(18,6) | 输出 Token 买入价 |
| sellPriceOutput | BigDecimal(18,6) | 输出 Token 卖出价 |
| failureCount | Integer | 连续失败次数（熔断计数） |
| lastFailureAt | LocalDateTime | 上次失败时间 |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |

**枚举类型**: `ServiceType { OLLAMA, VLLM }`  
**安全控制**: upstreamKey 使用 `@ToString.Exclude` 防止日志泄露

---

## Entity 层设计要点

### 生命周期回调
所有实体均包含：
- `@PrePersist onCreate()`: 首次保存时填充 createdAt 和 updatedAt
- `@PreUpdate onUpdate()`: 更新时刷新 updatedAt（BackendService、User、ApiKey）

### 关联关系策略
| 关系 | 类型 | Fetch | Cascade |
|------|------|-------|---------|
| User → ApiKey | OneToMany | EAGER (默认) | ALL + orphanRemoval |
| ApiKey → User | ManyToOne | LAZY | - |
| RequestLog → ApiKey | ManyToOne | LAZY | - |

### 乐观锁控制
- User 实体的 `version` 字段使用 `@Version`，UserBalanceService 扣减余额时会利用此机制避免并发冲突

---

## 常见修改定位

| 问题类型 | 优先检查 Entity |
|----------|------------------|
| 用户关联查询异常 | User.apiKeys 的 Cascade 配置 |
| Token 统计不准 | ApiKey.getRemainingTokens() 计算公式 |
| 日志体内容截断 | RequestLog.requestBody/responseBody 字段长度限制 |
