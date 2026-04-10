# Repository Layer - Data Access

## 概述
数据访问层使用 Spring Data JPA，定义 Repository 接口操作数据库实体。

## Entity 实体类

### 1. User (用户表)
**文件**: User.java
- **表名**: users
- **字段**:
  - id: Long (主键，自增)
  - username: String (唯一，用户名)
  - password: String (BCrypt 加密)
  - email: String (邮箱)
  - enabled: Boolean (是否启用)
  - userRole: String (USER/ADMIN)
  - balance: BigDecimal (用户余额，人民币)
  - version: Long (乐观锁版本号)
  - createdAt, updatedAt: LocalDateTime
- **关系**: @OneToMany -> ApiKey
- **实现**: UserDetails (Spring Security)

### 2. ApiKey (API 密钥表)
**文件**: ApiKey.java
- **表名**: api_keys
- **字段**:
  - id: Long (主键)
  - user: User (外键，所属用户)
  - apiKeyValue: String (唯一，实际 API Key 值)
  - name: String (密钥名称)
  - tokenLimit: Long (Token 限额，NULL=无限制)
  - usedTokens: Long (已使用 Token)
  - inputTokens: Long (输入 Token 统计)
  - outputTokens: Long (输出 Token 统计)
  - enabled: Boolean (是否启用)
  - expiresAt: LocalDateTime (过期时间)
  - targetUrl: String (自定义目标 URL)
  - routingConfig: String (路由配置，TEXT 类型)
  - lastUsedAt: LocalDateTime
- **方法**:
  - getRemainingTokens(): tokenLimit - usedTokens
  - useTokens(long count): 增加已使用量

### 3. BackendService (后端服务配置表)
**文件**: BackendService.java
- **表名**: backend_services
- **字段**:
  - id: Long (主键)
  - name: String (服务名称)
  - baseUrl: String (基础 URL)
  - serviceType: String (OLLAMA/VLLM)
  - upstreamKey: String (上游 API Key)
  - supportedModels: String (支持的模型，逗号分隔)
  - enabled: Boolean (是否启用)
  - timeoutSeconds: Integer (超时时间)

### 4. RequestLog (请求日志表)
**文件**: RequestLog.java
- **表名**: request_logs
- **字段**:
  - id: Long (主键)
  - apiKeyId: Long (外键，API Key ID)
  - userId: Long (用户 ID)
  - requestId: String (请求唯一标识)
  - inputTokens: Long (输入 Token)
  - outputTokens: Long (输出 Token)
  - model: String (使用的模型)
  - latencyMs: Long (延迟，毫秒)
  - status: RequestStatus (SUCCESS/FAIL/PENDING)
  - requestBody: String (请求体，TEXT)
  - responseBody: String (响应体，TEXT)
  - createdAt: LocalDateTime

## Repository 接口

### UserRepository
**文件**: UserRepository.java
`java
interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
`

### ApiKeyRepository
**文件**: ApiKeyRepository.java
`java
interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {
    Optional<ApiKey> findByApiKeyValue(String apiKeyValue);
    List<ApiKey> findByUserId(Long userId);
    Optional<ApiKey> findByIdAndApiKeyValue(Long id, String apiKeyValue);
}
`

### BackendServiceRepository
**文件**: BackendServiceRepository.java
`java
interface BackendServiceRepository extends JpaRepository<BackendService, Long> {
    List<BackendService> findByEnabledTrue();
}
`

### RequestLogRepository
**文件**: RequestLogRepository.java
`java
interface RequestLogRepository extends JpaRepository<RequestLog, Long> {
    List<RequestLog> findByApiKeyIdOrderByCreatedAtDesc(Long apiKeyId, Pageable pageable);
    List<RequestLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    // 自定义查询用于统计
}
`

## 数据库表关系图

`
+--------+       +----------+       +----------------+
|  User  |----<> | ApiKey   |       | BackendService |
+--------+       +----------+       +----------------+
    |                |
    |                v
    |         +--------------+
    +---------| RequestLog   |
              +--------------+
`

- User 1:N ApiKey (一个用户可有多个 API Key)
- ApiKey 1:N RequestLog (一个 API Key 产生多条日志)
- BackendService 独立配置表，通过模型名称关联

## JPA 配置

**application.yml**: 
`yaml
spring:
  jpa:
    open-in-view: false  # 关闭 OVIV，手动管理事务
    hibernate:
      ddl-auto: update   # 自动更新 schema
`

## 事务管理

- 使用 @Transactional 注解在 Service 层
- 默认传播行为：REQUIRED
- ApiKey Token 扣减需要事务保证

## 修改指南

- **新增字段**: 在 Entity 添加字段 + @Column 注解，JPA 自动更新表结构
- **新增查询方法**: 在 Repository 接口定义方法名 (Spring Data JPA 解析)
- **复杂查询**: 使用 @Query 注解写 JPQL 或原生 SQL
- **性能优化**: 添加索引 (@Index)、调整 fetch 类型 (LAZY/EAGER)
