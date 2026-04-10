# Service Layer - Business Logic

## 概述
服务层包含核心业务逻辑，处理 LLM 请求转发、认证验证、使用量统计等功能。

## 核心服务分类

### 1. LLM 转发服务 (核心)
**文件**: LlmForwardService.java
- **职责**: 传统聊天接口的请求转发（非流式）
- **关键方法**:
  - orwardChatRequest(String backendUrl, String model, String messages, boolean stream) - 转发聊天请求
  - orwardNonStreaming(String url, Map<String,Object> body) - 非流式转发
  - orwardStreaming(String url, Map<String,Object> body) - 流式转发（SSE）
  - estimateTokenUsage(String text) - 估算 Token 使用量
- **依赖**: WebClient (响应式 HTTP 客户端)

**文件**: OpenAiForwardService.java
- **职责**: OpenAI 兼容接口的请求转发（支持流式/非流式）
- **关键方法**:
  - orwardChatRequest() - 转发聊天完成请求
  - openStreamingChatRequest() - 打开流式连接
  - elayStream() - 中继 SSE 流数据
  - ewriteRequestForUpstream() - 重写请求体适配上游
- **特性**: 
  - 支持 SSE (Server-Sent Events) 流式响应
  - 自动模型名称映射
  - Token 使用量实时统计

### 2. 路由与配置解析
**文件**: RoutingConfigParser.java
- **职责**: 解析 API Key 的路由配置，决定请求转发目标
- **关键方法**:
  - esolveTargetUrl(String routingConfig, String defaultTargetUrl) - 解析目标 URL
  - esolveModel(String routingConfig, String requestedModel) - 解析模型名称映射
  - esolveConfiguredTargetUrl() - 获取配置的目标 URL
- **路由规则**: 支持 JSON 格式的路由配置，可实现模型别名、后端切换

### 3. 上游服务管理
**文件**: UpstreamProviderService.java
- **职责**: 管理后端 LLM 服务提供者（Ollama/vLLM）
- **关键方法**:
  - indAllEnabled() - 获取所有启用的服务
  - indByModelName(String model) - 根据模型名称查找对应服务
  - indById(Long id) - 根据 ID 查找服务
  - 	estConnectivity(BackendService service) - 测试连接性
- **数据源**: BackendServiceRepository

### 4. API Key 认证服务
**文件**: ApiKeyService.java
- **职责**: API Key 验证、Token 配额检查
- **关键方法**:
  - alidateApiKey(String apiKeyValue) - 验证 API Key
  - hasEnoughTokens(ApiKey key, long requiredTokens) - 检查 Token 余额
  - deductTokens(ApiKey key, long amount) - 扣除 Token
- **依赖**: ApiKeyRepository

### 5. 请求日志与统计
**文件**: RequestLogService.java
- **职责**: 异步记录请求日志、更新使用量统计
- **关键方法**:
  - syncLogRequest() - 异步写入请求日志
  - syncRecordUsage(Long apiKeyId, long totalTokens) - 异步记录 Token 使用
  - getDailyTokenStats(Long userId, LocalDate startDate, LocalDate endDate) - 获取每日统计
- **特性**: 使用异步执行器避免阻塞主流程

### 6. Dashboard & 监控服务
**文件**: DashboardService.java
- **职责**: 提供仪表板汇总数据
- **关键方法**:
  - getSummary() - 获取系统摘要（用户数、API Key 数等）
  - getUserStats() - 用户统计信息
  - getTokenUsageTrend() - Token 使用趋势

**文件**: SystemService.java
- **职责**: 系统资源监控（CPU/内存/磁盘）
- **关键方法**:
  - getSystemMonitorInfo() - 获取系统监控数据
- **依赖**: OSHI 库 (跨平台硬件信息)

### 7. 用户余额服务
**文件**: UserBalanceService.java
- **职责**: 管理用户余额（人民币）
- **关键方法**:
  - getBalance(Long userId) - 获取用户余额
  - echarge(Long userId, BigDecimal amount) - 充值
  - deduct(Long userId, BigDecimal amount) - 扣款

### 8. 请求队列服务
**文件**: RequestQueueService.java
- **职责**: 请求排队与限流（如需要）

## 核心调用链

### OpenAI 兼容接口完整流程
`
1. OpenAiCompatibleController.chatCompletions()
   |
   v
2. ApiKeyAuthenticationFilter (拦截器)
   - apiKeyService.validateApiKey() -> ApiKey entity
   |
   v
3. routingConfigParser.resolveModel() -> resolvedModel
   |
   v
4. upstreamProviderService.findByModelName(resolvedModel) -> BackendService
   |
   v
5. openAiForwardService.forwardChatRequest()
   - 非流式：直接返回响应体
   - 流式：打开 SSE 连接，relayStream() 中继数据
   |
   v
6. requestLogService.asyncRecordUsage() (异步)
   - 更新 ApiKey.usedTokens
   - 写入 RequestLog 记录
`

### Token 配额检查流程
`
1. LlmController.chat()
   |
   v
2. llmForwardService.estimateTokenUsage(messages) -> estimatedInput
   |
   v
3. apiKeyService.hasEnoughTokens(key, estimatedInput)
   - key.getRemainingTokens() = tokenLimit - usedTokens
   - 如果不足：返回 429 Too Many Requests
`

## Service 依赖关系图

`
Controller Layer
       |
       v
+------------------+     +-------------------+
| LlmController    |---->| LlmForwardService |
+------------------+     +-------------------+
       |                       |
       |                       v
       |               +-------------------+
       |               |WebClient/HttpClient|
       |               +-------------------+
       |
       v
+---------------------------+
| OpenAiCompatibleController|
+---------------------------+
       |
       +---> ApiKeyService (认证)
       +---> RoutingConfigParser (路由)
       +---> UpstreamProviderService (后端管理)
       +---> OpenAiForwardService (转发)
       +---> RequestLogService (日志)
`

## 异步处理机制

**配置**: WebMvcAsyncConfig.java
- 使用 @EnableAsync 启用异步支持
- 自定义线程池配置（在 application.yml）
- 核心线程数：8，最大线程数：32，队列容量：200

**异步方法标注**:
- RequestLogService.asyncLogRequest() - @Async
- RequestLogService.asyncRecordUsage() - @Async

## 修改指南

- **调整转发逻辑**: 修改 LlmForwardService / OpenAiForwardService
- **添加新的路由规则**: 扩展 RoutingConfigParser.resolveModel()
- **增加统计维度**: RequestLogService + RequestLog entity
- **优化性能**: 调整 WebMvcAsyncConfig 线程池参数
