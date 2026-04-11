# Service Layer - Business Logic

## 概述
服务层负责认证、路由、转发、计费、日志与统计。

## 核心服务

### 1. 转发服务
**文件**: `LlmForwardService.java`
- 传统 `/api/llm/chat` 转发
- 估算输入/输出 Token

**文件**: `OpenAiForwardService.java`
- OpenAI 兼容 `/v1/chat/completions` 转发
- 支持非流式和流式响应
- 解析流式响应中的输出 Token

### 2. 路由服务
**文件**: `RoutingConfigParser.java`
- 解析 API Key 路由配置
- 解析目标 URL 与模型映射

### 3. 上游服务管理
**文件**: `UpstreamProviderService.java`
- 根据模型匹配 `BackendService`
- 提供供应商卖价读取能力
- 管理上游可用性、连通性、模型发现

### 4. API Key 认证
**文件**: `ApiKeyService.java`
- API Key 查找与认证
- 记录 API Key 维度 Token 用量
- API Key 不再作为资金主体

### 5. 用户余额计费
**文件**: `UserBillingService.java`
- 基于 `userId` 做余额预检
- 按供应商 `sellPriceInput/sellPriceOutput` 计算费用
- 请求完成后按实际 Token 从用户余额扣款

**文件**: `UserBalanceService.java`
- 查询用户余额
- 高精度费用计算
- 余额扣减、退款、管理员调账

### 6. 请求日志与统计
**文件**: `RequestLogService.java`
- 异步写入 `RequestLog`
- 异步更新 `ApiKey.usedTokens`
- 日志包含 `userId`、输入/输出 Token、`costAmount`

### 7. Dashboard 与监控
**文件**: `DashboardService.java`
- 仪表板统计与趋势数据

**文件**: `SystemService.java`
- 系统资源监控

### 8. 并发辅助
**文件**: `RequestQueueService.java`
- 提供按用户串行执行能力
- 当前主计费流程尚未全面接入

## 当前计费链路

### OpenAI 兼容接口
1. `ApiKeyAuthenticationFilter` 解析 API Key
2. 通过 `ApiKey.user.id` 获取 `userId`
3. `RoutingConfigParser` 解析模型
4. `UpstreamProviderService.findByModelName()` 获取供应商
5. `UserBillingService.hasEnoughBalance()` 按输入 Token 预检余额
6. `OpenAiForwardService` 转发请求
7. 请求完成后 `UserBillingService.settleUsage()` 按实际输入/输出 Token 扣款
8. `RequestLogService` 异步写日志并记录 API Key 用量

### 传统接口
1. 解析 API Key 与 `userId`
2. 估算输入 Token
3. 解析模型并匹配供应商
4. 用户余额预检
5. 请求转发
6. 根据实际输入/输出 Token 结算并记录日志

## 修改指南
- 调整计费规则：优先修改 `UserBillingService` / `UserBalanceService`
- 调整上游卖价来源：修改 `BackendService` / `UpstreamProviderService`
- 调整日志统计字段：修改 `RequestLogService` / `RequestLog`
- 调整路由行为：修改 `RoutingConfigParser`
