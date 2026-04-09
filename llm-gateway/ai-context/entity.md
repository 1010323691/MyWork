# 实体类文档（Entity Layer）

## 模块职责

定义项目的核心数据模型，使用 JPA 进行数据库持久化。所有实体类均包含自动时间戳功能（created_at / updated_at）。

---

## 实体类列表

### 1. User (用户表)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/entity/User.java`

**数据库表**: `users`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键，自增 |
| username | String(50) | 用户名，唯一且必填 |
| password | String | 密码（BCrypt 加密） |
| email | String | 邮箱地址 |
| enabled | Boolean | 账号启用状态，默认 true |
| userRole | String(20) | 角色：USER / ADMIN，默认 USER |
| balance | BigDecimal | 用户余额（人民币） |
| version | Long | 乐观锁版本号 |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |

**关系**: 一对多关联 ApiKey

**实现接口**: `UserDetails` (Spring Security)

---

### 2. ApiKey (API 密钥表)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/entity/ApiKey.java`

**数据库表**: `api_keys`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键，自增 |
| user | User | 关联用户（多对一） |
| apiKeyValue | String | API Key 值，唯一且必填 |
| name | String | Key 名称/描述 |
| tokenLimit | Long | Token 配额限制（null 为无限制） |
| usedTokens | Long | 已使用 Token 数，默认 0 |
| inputTokens | Long | 输入 Token 累计统计 |
| outputTokens | Long | 输出 Token 累计统计 |
| enabled | Boolean | 启用状态，默认 true |
| expiresAt | LocalDateTime | 过期时间 |
| targetUrl | String | 目标服务 URL |
| routingConfig | TEXT | 路由配置（JSON 格式） |
| lastUsedAt | LocalDateTime | 最后使用时间 |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |

**重要方法**:
- `getRemainingTokens()`: 获取剩余 Token
- `useTokens(long count)`: 消耗 Token

---

### 3. RequestLog (请求日志表)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/entity/RequestLog.java`

**数据库表**: `request_logs`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键，自增 |
| apiKey | ApiKey | 关联 API Key（多对一） |
| requestId | String(64) | 请求追踪 ID |
| userId | Long | 用户 ID（冗余字段，便于查询） |
| inputTokens | Long | 输入 Token 数 |
| outputTokens | Long | 输出 Token 数 |
| modelName | String | 使用的模型名称 |
| latencyMs | Long | 请求延迟（毫秒） |
| costAmount | BigDecimal | 消耗金额（人民币） |
| status | Enum | 状态：SUCCESS / FAIL |
| requestBody | TEXT | 请求体内容 |
| responseBody | TEXT | 响应体内容 |
| createdAt | LocalDateTime | 创建时间 |

**索引**:
- `idx_request_logs_api_key_id`: API Key ID 索引
- `idx_request_logs_created_at`: 创建时间索引
- `idx_request_log_user_id`: 用户 ID 索引
- `idx_request_log_request_id`: 请求 ID 索引

---

### 4. BackendService (后端服务表)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/entity/BackendService.java`

**数据库表**: `backend_services`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键，自增 |
| name | String | 服务名称 |
| baseUrl | String | 基础 URL |
| serviceType | Enum | 服务类型：OLLAMA / VLLM |
| enabled | Boolean | 启用状态，默认 true |
| timeoutSeconds | Integer | 超时时间（秒），默认 300 |
| upstreamKey | String(512) | 上游 API Key（敏感） |
| buyPriceInput | BigDecimal | 输入 Token 买入价（元/百万 Token） |
| sellPriceInput | BigDecimal | 输入 Token 卖出价 |
| buyPriceOutput | BigDecimal | 输出 Token 买入价 |
| sellPriceOutput | BigDecimal | 输出 Token 卖出价 |
| failureCount | Integer | 连续失败次数（熔断用） |
| lastFailureAt | LocalDateTime | 上次失败时间 |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |

---

## 实体关系图

```
User (1) ────< (N) ApiKey <─── (N) RequestLog (1)

BackendService (独立表，供 LlmForwardService 引用)
```

---

## 修改指引

| 需求 | 修改文件 |
|------|----------|
| 新增用户字段 | `User.java` + 检查相关 DTO |
| 增加 Token 统计维度 | `ApiKey.java` + `RequestLog.java` |
| 添加服务类型 | `BackendService.ServiceType` 枚举 |
| 修改价格精度 | `BackendService.java` BigDecimal 的 scale |
