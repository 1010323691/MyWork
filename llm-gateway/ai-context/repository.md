# Repository 层文档

## 概述
Repository 层负责数据访问，基于 Spring Data JPA 实现。提供基础 CRUD 和自定义查询方法。

## 文件清单

| 文件 | 路径 | 职责 |
|------|------|------|
| UserRepository | `src/main/java/com/nexusai/llm/gateway/repository/UserRepository.java` | 用户数据访问 |
| ApiKeyRepository | `src/main/java/com/nexusai/llm/gateway/repository/ApiKeyRepository.java` | API Key 数据访问 |
| RequestLogRepository | `src/main/java/com/nexusai/llm/gateway/repository/RequestLogRepository.java` | 请求日志数据访问 |
| BackendServiceRepository | `src/main/java/com/nexusai/llm/gateway/repository/BackendServiceRepository.java` | 后端服务配置访问 |

---

## UserRepository
**文件**: `src/main/java/com/nexusai/llm/gateway/repository/UserRepository.java`

### 继承关系
```
extends JpaRepository<User, Long>
```

### 自定义方法

| 方法 | 描述 |
|------|------|
| `Optional<User> findByUsername(String username)` | 根据用户名查询 |
| `boolean existsByUsername(String username)` | 检查用户名是否存在 |
| `boolean existsByEmail(String email)` | 检查邮箱是否存在 |
| `Page<User> findAll(Pageable pageable)` | 分页查询所有用户 |
| `Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable)` | 按用户名模糊搜索（分页） |
| `Long count()` | 统计用户总数 |

### 使用场景
- `findByUsername()` - 登录时验证用户
- `existsByUsername()` / `existsByEmail()` - 注册时唯一性校验
- `findByUsernameContainingIgnoreCase()` - 管理员搜索用户

---

## ApiKeyRepository
**文件**: `src/main/java/com/nexusai/llm/gateway/repository/ApiKeyRepository.java`

### 继承关系
```
extends JpaRepository<ApiKey, Long>
```

### 自定义方法

| 方法 | 描述 |
|------|------|
| `Optional<ApiKey> findByApiKeyValue(String apiKeyValue)` | 根据 Key 值查找 |
| `List<ApiKey> findByUserId(Long userId)` | 查询用户的所有 API Keys |
| `List<ApiKey> findByUserIdAndEnabled(Long userId, Boolean enabled)` | 查询用户启用的 API Keys |
| `List<ApiKey> findByUserIdAndExpiresAtAfter(Long userId, LocalDateTime now)` | 查询未过期的 API Keys |
| `Optional<ApiKey> findByIdAndUserId(Long id, Long userId)` | 根据 ID 和用户 ID 查找（权限校验） |
| `Optional<ApiKey> findByIdAndUserIdAndEnabledTrue(Long id, Long userId)` | 根据 ID、用户 ID 和启用状态查找 |
| `Page<ApiKey> findByUserId(Long userId, Pageable pageable)` | 用户 API Keys 分页 |
| `Page<ApiKey> findAll(Pageable pageable)` | 管理员查看所有 Keys 分页 |
| `Long countByUserId(Long userId)` | 统计用户的 Key 数量 |
| `Long countByUserIdAndEnabled(Long userId, Boolean enabled)` | 统计用户的启用 Key 数量 |
| `Long sumUsedTokensByUserId(Long userId)` | 统计用户的总 Token 使用量 |
| `Long count()` | 统计所有 Key 数量 |
| `@Modifying @Query` incrementUsedTokens() | 动态扣减 Token（原生 SQL） |

### 特殊查询 - incrementUsedTokens
```java
@Modifying
@Query("UPDATE ApiKey a SET a.usedTokens = a.usedTokens + :count WHERE a.id = :id")
void incrementUsedTokens(@Param("id") Long id, @Param("count") long count, @Param("now") LocalDateTime now);
```

### 使用场景
- `findByApiKeyValue()` - API Key 认证时查找
- `findByUserId()` - 用户查看自己的 Keys
- `countByUserIdAndEnabled()` - 统计活跃 Keys
- `incrementUsedTokens()` - 异步扣减 Token

---

## RequestLogRepository
**文件**: `src/main/java/com/nexusai/llm/gateway/repository/RequestLogRepository.java`

### 继承关系
```
extends JpaRepository<RequestLog, Long>
```

### 自定义方法

| 方法 | 描述 |
|------|------|
| `List<RequestLog> findByApiKey(ApiKey apiKey)` | 查询 API Key 的所有日志 |
| `Page<RequestLog> findByApiKeyAndStatus(ApiKey apiKey, RequestStatus status, Pageable pageable)` | 按状态过滤日志 |
| `Page<RequestLog> findByApiKey_UserId(Long userId, Pageable pageable)` | 用户日志分页 |
| `Page<RequestLog> findAll(Specification<RequestLog> spec, Pageable pageable)` | 动态查询（复杂过滤） |
| `List<RequestLog> findByApiKey_UserIdAndCreatedAtBetween(Long userId, LocalDateTime start, LocalDateTime end)` | 按日期范围查询 |
| `Long countByApiKey(ApiKey apiKey)` | 统计 Key 的请求次数 |
| `Long sumInputTokensByApiKey(ApiKey apiKey)` | 统计输入 Token 总和 |
| `Long sumOutputTokensByApiKey(ApiKey apiKey)` | 统计输出 Token 总和 |
| `Long countByApiKey_UserId(Long userId)` | 统计用户的请求次数 |
| `Long sumTokensByUserSince(Long userId, LocalDateTime since)` | 统计用户某时间后的 Token 总消耗 |
| `Long countSuccessByUserId(Long userId)` | 统计用户成功请求数 |
| `Long countSuccess()` | 统计系统总成功请求数 |
| `Long countFail()` | 统计系统总失败请求数 |
| `Long sumAllTokens()` | 统计系统总 Token 消耗 |
| `Double avgLatencySince(LocalDateTime since)` | 统计平均响应时间 |
| `List<Object[]> getDailyTrendByUser(Long userId, LocalDateTime since)` | 用户 Token 趋势（按天） |

### 复杂查询 - Daily Trend
```java
@Query("SELECT FUNCTION('DATE', r.createdAt), SUM(r.inputTokens + r.outputTokens) " +
       "FROM RequestLog r " +
       "WHERE r.apiKey.user.id = :userId AND r.createdAt >= :since " +
       "GROUP BY FUNCTION('DATE', r.createdAt) " +
       "ORDER BY FUNCTION('DATE', r.createdAt)")
```

### 使用场景
- `countByApiKey_UserId()` - 用户统计
- `sumTokensByUserSince()` - 日/月 Token 统计
- `getDailyTrendByUser()` - 趋势图表
- `countSuccess()` / `countFail()` - 系统监控

---

## BackendServiceRepository
**文件**: `src/main/java/com/nexusai/llm/gateway/repository/BackendServiceRepository.java`

### 继承关系
```
extends JpaRepository<BackendService, Long>
```

### 自定义方法
- 暂无自定义方法，仅提供基础 CRUD

### 使用场景
- 预留，用于未来后端服务配置管理

---

## 查询性能优化

### 索引
**RequestLog 表索引**:
```java
@Table(indexes = {
    @Index(name = "idx_request_logs_api_key_id", columnList = "api_key_id"),
    @Index(name = "idx_request_logs_created_at", columnList = "created_at")
})
```

### 分页查询
- 所有列表查询都使用 `Pageable` 分页
- 默认页大小：20 条

### 聚合查询
- 使用 `sum()`、`count()`、`avg()` 进行统计分析
- 避免一次性加载大量数据

---

## 修改定位指南

| 问题类型 | 优先查看文件 | 原因 |
|----------|-------------|------|
| 查询返回为空 | 检查 `findBy*` 方法的查询条件 | 参数是否匹配 |
| 分页不对 | 检查 `Pageable` 参数和排序 | 页码、每页大小 |
| 统计不准 | 检查聚合方法的查询条件 | `WHERE` 条件是否完整 |
| 查询慢 | 检查是否缺少索引 | `EXPLAIN` SQL 分析 |
| 需要新查询 | 添加新的 `findBy*` 或自定义 `@Query` | 按方法命名规则 |
| 动态过滤 | 使用 `Specification` 或 `@Query` + 参数 | 复杂条件组合 |

### 方法命名规则
```
findBy[属性名][操作符][And|Or][属性名][操作符]
操作符：Between, After, Before, Like, Contains, IgnoringCase
```
