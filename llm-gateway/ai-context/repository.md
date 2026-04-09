# Repository 层文档（数据仓库）

## 模块职责

使用 Spring Data JPA 进行数据库操作，提供 CRUD 和自定义查询功能。所有接口继承自 `JpaRepository`，自动获得基本的增删改查能力。

---

## Repository 列表

### 1. UserRepository (用户数据仓库)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/repository/UserRepository.java`

```java
interface UserRepository extends JpaRepository<User, Long> {
    // 根据用户名查找（级联加载 apiKeys）
    Optional<User> findByUsername(String username);
    
    // 检查用户是否存在
    boolean existsByUsername(String username);
    
    // 检查邮箱是否已存在
    boolean existsByEmail(String email);
    
    // 模糊查询用户（分页）
    Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable);
}
```

---

### 2. ApiKeyRepository (API Key 数据仓库) ⭐核心

**文件路径**: `src/main/java/com/nexusai/llm/gateway/repository/ApiKeyRepository.java`

```java
interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    // 根据 Key 值查找
    Optional<ApiKey> findByApiKeyValue(String apiKeyValue);
    
    // 查询用户的所有 Keys
    List<ApiKey> findByUserId(Long userId);
    
    // 按启用状态筛选
    List<ApiKey> findByEnabled(Boolean enabled);
    
    // 检查 Key 是否存在
    boolean existsByApiKeyValue(String apiKeyValue);
    
    // 统计用户的 Key 数量
    Long countByUserId(Long userId);
    
    // 统计用户启用的 Key 数量
    Long countByUserIdAndEnabled(Long userId, Boolean enabled);
    
    // 计算用户使用的所有 Token 总数（自定义查询）
    Long sumUsedTokensByUserId(@Param("userId") Long userId);
    
    // ⭐ 原子性增加 usedTokens + 更新 lastUsedAt（用于并发扣减）
    @Modifying
    @Transactional
    void incrementUsedTokens(@Param("id") Long id, 
                             @Param("tokens") long tokens, 
                             @Param("now") LocalDateTime now);
}
```

**重要说明**: `incrementUsedTokens` 使用 SQL UPDATE + SET ... = ... + :param 实现原子性更新，避免并发问题。

---

### 3. RequestLogRepository (请求日志数据仓库) ⭐核心

**文件路径**: `src/main/java/com/nexusai/llm/gateway/repository/RequestLogRepository.java`

```java
interface RequestLogRepository extends JpaRepository<RequestLog, Long>, 
                                         JpaSpecificationExecutor<RequestLog> {
    
    // 查询用户的请求日志（分页）
    Page<RequestLog> findByApiKey_User_Id(Long userId, Pageable pageable);
    
    // ⭐ 获取用户每日 Token 使用趋势（原生 SQL，按日分组）
    @Query(value = "SELECT DATE_FORMAT(r.created_at,'%Y-%m-%d') as date, " +
                   "COALESCE(SUM(r.input_tokens + r.output_tokens), 0) as tokens " +
                   "FROM request_logs r WHERE ...", nativeQuery = true)
    List<Object[]> getDailyTrendByUser(@Param("userId") Long userId, 
                                       @Param("since") LocalDateTime since);
    
    // 统计用户自某时间以来的 Token 总数
    Long sumTokensByUserSince(@Param("userId") Long userId, 
                              @Param("since") LocalDateTime since);
    
    // 统计用户请求总数
    Long countByUserId(@Param("userId") Long userId);
    
    // 统计用户成功请求数
    Long countSuccessByUserId(@Param("userId") Long userId);
    
    // 全局成功/失败统计
    Long countSuccess();
    Long countFail();
    
    // 计算平均延迟（自某时间）
    Double avgLatencySince(@Param("since") LocalDateTime since);
    
    // 全局 Token 总数
    Long sumAllTokens();
}
```

**继承说明**: `JpaSpecificationExecutor<RequestLog>` 支持动态条件查询（使用 Specification API）。

---

### 4. BackendServiceRepository (后端服务数据仓库)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/repository/BackendServiceRepository.java`

```java
interface BackendServiceRepository extends JpaRepository<BackendService, Long> {
    // 查询启用的服务列表
    List<BackendService> findByEnabled(Boolean enabled);
    
    // 根据 ID 查找（常用）
    Optional<BackendService> findById(Long id);
}
```

---

## Repository 调用关系图

```
Controller/Service              →      Repository              →     Entity
────────────────────           ────────          ─────       ─────────────
AuthController                  →       UserRepository        →     User

ApiKeyController                →       ApiKeyRepository      →     ApiKey

LlmController                                                          
    ↓                                                             
RequestLogService             →       RequestLogRepository  →     RequestLog
                                ApiKeyRepository.incrementUsedTokens()

AdminController               →       UserRepository + BackendServiceRepository
```

---

## 修改指引

| 需求 | 操作方式 |
|------|----------|
| 新增查询条件 | 使用 `JpaSpecificationExecutor` 的 Specification API（动态过滤） |
| 统计查询优化 | 考虑添加原生 SQL 查询或使用 JPQL |
| 并发更新字段 | 使用 `@Modifying + @Transactional` 原子性操作 |
| 分页排序支持 | 参数传递 `Pageable/PageRequest` |
