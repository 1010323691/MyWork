# Repository 层说明

## 概述

Repository 层负责数据持久化操作，基于 Spring Data JPA 实现。提供标准的 CRUD 接口和自定义查询方法，简化数据库访问逻辑。

---

## Repository 清单

### 1. UserRepository
**路径**: `repository/UserRepository.java`  
**实体类**: User  
**职责**: 用户数据访问

| 方法 | 说明 |
|------|------|
| findByUsername(username) | 根据用户名查找（含 EntityGraph 预加载 apiKeys） |
| existsByUsername(username) | 检查用户名是否存在 |
| existsByEmail(email) | 检查邮箱是否存在 |
| findByUsernameContainingIgnoreCase(username, pageable) | 模糊查询用户（忽略大小写，分页） |

**特性**: `@EntityGraph(attributePaths = {"apiKeys"})` 防止 N+1 查询问题

---

### 2. ApiKeyRepository
**路径**: `repository/ApiKeyRepository.java`  
**实体类**: ApiKey  
**职责**: API Key 数据访问

| 方法 | 说明 |
|------|------|
| findByApiKeyValue(key) | 根据密钥值查找（返回 Optional） |
| findByUserId(userId) | 获取用户所有 API Keys |
| findByEnabled(enabled) | 按启用状态筛选 |
| existsByApiKeyValue(key) | 检查 Key 是否存在 |
| countByUserId(userId) | 统计用户 API Key 数量 |
| countByUserIdAndEnabled(userId, enabled) | 统计指定状态的 Key 数量 |
| sumUsedTokensByUserId(userId) | 求和用户的已用 Token 总量 |
| incrementUsedTokens(id, tokens, now) | 增量更新 usedTokens（原生 UPDATE 语句） |

**特性**: `@Modifying` + `@Transactional` 用于执行 UPDATE 操作

---

### 3. RequestLogRepository
**路径**: `repository/RequestLogRepository.java`  
**实体类**: RequestLog  
**职责**: 请求日志数据访问与统计分析

| 方法 | 说明 |
|------|------|
| findByApiKey_User_Id(userId, pageable) | 分页查询用户的请求日志 |
| getDailyTrendByUser(userId, since) | 获取每日 Token 使用趋势（原生 SQL，按日期分组） |
| sumTokensByUserSince(userId, since) | 统计用户指定时间后的 Token 总量 |
| countByUserId(userId) | 统计用户的请求总数 |
| countSuccessByUserId(userId) | 统计用户成功请求数 |
| countSuccess() | 全局成功请求计数 |
| countFail() | 全局失败请求计数 |
| avgLatencySince(since) | 计算指定时间后的平均延迟（毫秒） |
| sumAllTokens() | 全局 Token 使用总量 |

**特性**:
- 继承 `JpaSpecificationExecutor`，支持动态条件查询（Specification API）
- 原生 SQL (`@Query(nativeQuery = true)`) 用于复杂分组聚合

---

### 4. BackendServiceRepository
**路径**: `repository/BackendServiceRepository.java`  
**实体类**: BackendService  
**职责**: 上游 Provider 配置数据访问

| 方法 | 说明 |
|------|------|
| findByEnabled(enabled) | 按启用状态筛选 Provider |

**特性**: 简单 CRUD，主要依赖 JpaRepository 基础接口

---

## Repository 层设计要点

### 查询优化策略
- **EntityGraph**: UserRepository.findByUsername 预加载关联的 apiKeys，避免懒加载异常
- **原生 SQL**: 复杂聚合查询使用 nativeQuery = true（如每日趋势统计）
- **批量更新**: incrementUsedTokens 使用 UPDATE 语句而非 SELECT + UPDATE 减少网络往返

### 分页支持
- UserController.getUserLogs 调用 `findByApiKey_User_Id` 时使用 Pageable 参数
- AdminController.listUsers 调用 `findByUsernameContainingIgnoreCase` 支持模糊搜索分页

---

## 常见修改定位

| 问题类型 | 优先检查 Repository |
|----------|---------------------|
| 用户信息查询慢 | UserRepository.findByUsername EntityGraph 配置 |
| Token 统计不准 | RequestLogRepository.sumTokensByUserSince 查询条件 |
| API Key 更新失败 | ApiKeyRepository.incrementUsedTokens 事务传播行为 |
