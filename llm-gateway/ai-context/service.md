# Service Layer - Business Logic

## 概述
服务层负责认证辅助、模型路由、上游转发、计费扣费、余额流水、日志查询、仪表板统计和系统监控。

## 核心服务

### 1. 转发服务
**文件**: `LlmForwardService.java`
- 处理传统 `/api/llm/chat` 非流式转发
- 负责简单输入 Token 估算

**文件**: `OpenAiForwardService.java`
- 处理 `/v1/chat/completions`
- 支持非流式与流式响应
- 负责从响应中提取输出 Token

### 2. 路由与上游服务
**文件**: `RoutingConfigParser.java`
- 解析 API Key 上的路由配置
- 解析目标 URL 与模型映射

**文件**: `UpstreamProviderService.java`
- 根据模型匹配 `BackendService`
- 提供上游定价读取
- 管理上游可用性、连通性和熔断状态
- 熔断统计已经接入 `LlmController` 和 `OpenAiCompatibleController`

### 3. API Key 与响应映射
**文件**: `ApiKeyService.java`
- 根据明文 key 查询并校验 API Key
- 创建新的 API Key

**文件**: `ApiKeyConcurrencyGuard.java`
- 统一控制转发请求并发
- 同时支持总并发限制和单 API Key 并发限制
- 超出限制时按公平队列等待，不直接返回错误

**文件**: `ApiKeyResponseMapper.java`
- 统一把 `ApiKey` 映射成 `ApiKeyResponse`
- 供 `ApiKeyController` 和 `AdminController` 复用，避免重复 DTO 拼装

### 4. 用户计费、余额与流水
**文件**: `UserBillingService.java`
- 负责余额预检
- 根据上游卖价估算和结算请求成本
- 在请求完成后按实际输入/输出 Token 扣费

**文件**: `UserBalanceService.java`
- 查询用户余额
- 做高精度费用估算
- 执行余额扣减和管理员调账
- 依赖 `User` 的 `@Version` 做乐观锁重试

**文件**: `BalanceTransactionService.java`
- 记录模型调用扣费流水
- 记录管理员充值与扣减流水
- 提供用户余额流水分页查询

### 5. 请求日志与查询
**文件**: `RequestLogService.java`
- 异步写入 `RequestLog`
- 异步更新 `ApiKey.usedTokens`
- 当前统一使用精简后的 `asyncLogRequest(...)` 接口

**文件**: `LogQueryService.java`
- 统一管理员和普通用户的日志筛选逻辑
- 统一分页、日期解析、状态解析和 `RequestLogResponse` 映射
- 供 `AdminLogController` 和 `UserController` 复用

### 6. Dashboard 与监控
**文件**: `DashboardService.java`
- 提供仪表板汇总数据
- 产出 `dailyTrend`、`modelMetrics`、请求状态分布、API Key 状态分布

**文件**: `SystemService.java`
- 提供 CPU、内存、GPU 资源数据
- 供 `/api/admin/monitor` 和 `/api/dashboard/summary` 组合使用

## 当前主链路

### OpenAI 兼容接口
1. `ApiKeyAuthenticationFilter` 解析 API Key
2. 根据 `ApiKey.user.id` 获取 `userId`
3. `RoutingConfigParser` 解析模型
4. `UpstreamProviderService.findByModelName()` 查找上游
5. `UpstreamProviderService.isCircuitOpen()` 拦截熔断中的上游
6. `UserBillingService.hasEnoughBalance()` 做余额预检
7. `ApiKeyConcurrencyGuard` 按总并发和单 key 并发排队获取名额
8. `OpenAiForwardService` 转发请求
9. 成功时 `UserBillingService.settleUsage()` 结算并 `recordSuccess()`
10. `BalanceTransactionService` 写入扣费流水
11. `RequestLogService` 异步写日志

### 传统接口
1. 解析 API Key 对应的 `userId`
2. `LlmForwardService.estimateInputTokens()` 估算输入 Token
3. 解析模型并匹配上游
4. 检查熔断状态和用户余额
5. `ApiKeyConcurrencyGuard` 按总并发和单 key 并发排队获取名额
6. 发起请求转发
7. 按实际输入/输出 Token 结算
8. 记录余额流水和请求日志

## 已清理的遗留项
- `RequestQueueService` 已删除，不再作为并发扣费方案
- `AuthResponse` 已删除
- `LlmForwardService.forwardStreaming()` 已删除
- `ApiKeyService.findByKeyNoCache()` 已删除
- `UserBalanceService` 中未接入主链路的冻结、退款、结算初始化方法已移除
- `pricing` 页面及其脚本已从前端链路删除

## 修改指南
- 调整计费规则：优先查看 `UserBillingService`、`UserBalanceService`
- 调整资金明细展示：查看 `BalanceTransactionService`
- 调整上游路由或熔断：查看 `RoutingConfigParser`、`UpstreamProviderService`
- 调整日志查询：查看 `LogQueryService`、`RequestLogService` 和 `RequestLogRepository`
