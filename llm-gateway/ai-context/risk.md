# 风险点文档

## 高风险点

### 1. 计费逻辑分散
**文件**:
- `UserBillingService.java`: 估算和结算
- `UserBalanceService.java`: 余额扣除
- `BalanceTransactionService.java`: 交易记录
- `LlmForwardService.java`: Token 使用量处理

**风险**:
- 计费逻辑分散在多个服务中，修改时需协调多个文件
- `settleUsage()` 在 `UserBillingService` 中调用 `userBalanceService.deductBalance()`，但流式响应中可能在 `LlmForwardService` 中处理
- 余额检查和实际扣费之间可能存在竞态条件

**影响范围**: 计费、余额、交易记录

---

### 2. 路由配置解析
**文件**:
- `RoutingConfigParser.java`: 路由配置解析
- `ApiKey.java`: routingConfig 字段存储 JSON 字符串
- `AdminProviderController.java`: 提供商管理

**风险**:
- `routingConfig` 存储为 JSON 字符串，无 schema 验证
- `resolveModel()` 和 `resolveTargetUrl()` 解析失败时静默忽略，返回默认值
- 解析异常仅记录日志，不抛异常，可能导致路由错误而不易发现

**影响范围**: 所有 LLM 请求路由

---

### 3. 熔断器状态管理
**文件**:
- `UpstreamProviderService.java`: 熔断器状态 (`failureCount`, `lastFailureAt`)
- `BackendService.java`: 实体字段

**风险**:
- 熔断器状态存储在数据库，高并发下可能存在竞态条件
- `recordFailure()` 和 `recordSuccess()` 无乐观锁保护
- 重置熔断器需要手动调用 API

**影响范围**: 提供商可用性

---

### 4. API Key 认证
**文件**:
- `ApiKeyAuthenticationFilter.java`: 认证过滤器
- `ApiKeyService.java`: Key 查找服务
- `SecurityConfig.java`: 认证配置

**风险**:
- API Key 明文存储在数据库 (仅创建时显示)
- 认证状态通过 Request 属性传递，可能在过滤器链中丢失
- 多个 Header 支持 (`X-API-Key`, `x-api-key`, `Authorization: Bearer`)，优先级逻辑复杂

**影响范围**: 所有 API 请求认证

---

### 5. 流式响应处理
**文件**:
- `WebMvcAsyncConfig.java`: 异步配置
- `OpenAiCompatibleController.java`: 流式响应
- `AnthropicCompatibleController.java`: 流式响应
- `LlmForwardService.java`: 转发服务

**风险**:
- 流式响应使用异步线程池，配置不当可能导致资源耗尽
- Token 统计和日志记录在流式完成后异步处理，可能丢失数据
- `DeferredResult` 超时配置为 5 分钟，长连接可能阻塞资源

**影响范围**: 流式请求处理

---

## 紧耦合点

### 1. Controller 直接调用 Service
**文件**:
- `LlmController.java` → `LlmForwardService`, `UserBillingService`
- `OpenAiCompatibleController.java` → `OpenAiForwardService`, `UserBillingService`
- `AnthropicCompatibleController.java` → `AnthropicForwardService`, `UserBillingService`

**风险**: Controller 层直接调用多个 Service，业务逻辑分散，测试困难

---

### 2. 实体与 DTO 转换
**文件**:
- `ProviderDTO.java`: 手动转换 (不使用 MapStruct)
- `ApiKeyResponseMapper.java`: Key 响应映射
- 各个 Controller 手动转换实体为 DTO

**风险**: 转换逻辑分散，字段变更时需修改多处

---

### 3. 安全过滤器链依赖
**文件**:
- `SecurityConfig.java`: 定义过滤器顺序
- `GatewayRequestLoggingFilter.java` → `RoutingConfigParser`, `UpstreamProviderService`
- `SecurityProtectionFilter.java` → `SecurityThrottleService`
- `ApiKeyAuthenticationFilter.java` → `ApiKeyService`

**风险**:
- 过滤器之间通过 Request 属性传递状态，耦合度高
- `GatewayRequestLoggingFilter` 依赖业务服务 (`UpstreamProviderService`)，违反关注点分离

---

### 4. 请求日志与计费耦合
**文件**:
- `RequestLogService.java`: 日志记录
- `UserBillingService.java`: 计费结算

**风险**: 日志记录中包含计费信息，修改计费逻辑需同步修改日志结构

---

## 易错逻辑

### 1. Token 计算
**位置**: `LlmForwardService.java`

**风险**:
```java
// 缓存 Token 逻辑
long cachedInputTokens = cachedNode != null && !cachedNode.isMissingNode() 
    ? cachedNode.asLong() : 0L;
```
- 上游 API 返回格式不一致可能导致解析失败
- `totalInputTokens` 和 `inputTokens + cachedInputTokens` 关系不明确

---

### 2. BigDecimal 比较
**位置**: `UserBillingService.java`

**风险**:
```java
return balance.compareTo(estimatedCost) >= 0;
```
- 浮点精度问题可能导致余额检查错误
- 扣费和检查使用相同计算公式，但可能存在时间差

---

### 3. 时间窗口计算
**位置**: `SecurityThrottleService.java`

**风险**:
```java
Duration.ofMinutes(Math.max(1, protectionProperties.getLogin().getIpWindowMinutes()))
```
- 限流窗口配置为 0 时会强制为 1 分钟
- 时间窗口重置逻辑依赖 Redis/内存，重启后限流失效

---

### 4. JSON 解析无验证
**位置**: `RoutingConfigParser.java`

**风险**:
```java
JsonNode root = objectMapper.readTree(routingConfig);
JsonNode mappings = root.path("modelMappings");
return mappings.get(requestedModel).asText(); // 可能返回空字符串
```
- `asText()` 对缺失节点返回空字符串而非 null
- 无效 JSON 仅记录日志，不影响流程

---

## 需协同修改的文件

### 修改计费逻辑
需修改文件:
1. `UserBillingService.java` - 核心计费
2. `UserBalanceService.java` - 余额操作
3. `BalanceTransactionService.java` - 交易记录
4. `RequestLog.java` - 日志实体
5. `RequestLogResponse.java` - 日志响应
6. `DashboardSummaryResponse.java` - 统计指标
7. `BackendService.java` - 价格字段

---

### 修改路由配置
需修改文件:
1. `RoutingConfigParser.java` - 解析逻辑
2. `ApiKey.java` - 实体字段
3. `ApiKeyRequest.java` - 创建请求
4. `AdminKeyUpdateRequest.java` - 更新请求
5. `GatewayRequestLoggingFilter.java` - 日志记录

---

### 修改认证逻辑
需修改文件:
1. `SecurityConfig.java` - 安全配置
2. `ApiKeyAuthenticationFilter.java` - API Key 认证
3. `SecurityProtectionFilter.java` - 限流保护
4. `GatewayRequestLoggingFilter.java` - 请求日志
5. `AuthService.java` - 用户认证

---

### 修改 LLM 转发
需修改文件:
1. `LlmForwardService.java` - 核心转发
2. `OpenAiForwardService.java` - OpenAI 格式
3. `AnthropicForwardService.java` - Anthropic 格式
4. `LlmController.java` - 聊天端点
5. `OpenAiCompatibleController.java` - OpenAI 兼容端点
6. `AnthropicCompatibleController.java` - Anthropic 兼容端点

---

## 数据库事务风险

### 1. 余额扣费无事务
**文件**: `UserBalanceService.java`

**风险**:
```java
// 扣费和交易记录分离，可能一方成功一方失败
userRepository.decrementBalance(userId, amount);
balanceTransactionService.createTransaction(...);
```

---

### 2. API Key Token 统计
**文件**: `ApiKeyRepository.java`

**风险**:
```java
@Modifying
@Query("UPDATE ApiKey a SET a.usedTokens = a.usedTokens + :tokens WHERE a.id = :id")
void incrementUsedTokens(@Param("id") Long id, @Param("tokens") Long tokens);
```
- 批量更新无版本控制，可能覆盖并发修改

---

## 配置项风险

### application.yml 关键配置

| 配置项 | 风险 |
|--------|------|
| gateway.default-backend-url | 默认后端 URL 为空时路由失败 |
| gateway.async.request-timeout-ms | 超时过短导致请求中断 |
| app.security.protection.enabled | 禁用后无安全防护 |
| spring.datasource.url | 数据库连接失败 |
| management.endpoints.web.exposure.include | 暴露过多端点可能泄露信息 |
