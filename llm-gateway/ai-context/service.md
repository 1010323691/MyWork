# Service 层说明

## 概述

Service 层是项目的核心业务逻辑处理层，负责协调数据访问、实现业务流程、调用外部服务。本项目包含 LLM 转发、日志记录、Token 管理、用户余额、上游 Provider 管理等核心服务。

---

## 服务清单

### 1. LlmForwardService
**路径**: `service/LlmForwardService.java`  
**职责**: LLM 请求转发核心实现（HTTP 客户端封装）

| 方法 | 说明 |
|------|------|
| forwardChatRequest | 主入口：根据配置转发聊天请求到上游后端（支持流式/非流式） |
| buildChatApiUrl | 构建目标 API URL（追加 `/api/chat` 路径） |
| parseMessages | 解析消息体为 OpenAI 格式 |
| forwardNonStreaming | 执行普通 HTTP POST 请求并返回完整响应 |
| forwardStreaming | 执行流式转发，聚合 SSE 数据块 |
| estimateTokenUsage | 估算 Token 使用量（英文/中文混合计算） |

**依赖**: `BackendServiceRepository`（获取上游配置）、`ObjectMapper`、`WebClient`  
**核心逻辑**:
- 构建请求体包含 model/messages/stream 字段
- 非流式模式直接返回后端响应字符串
- 流式模式聚合 SSE 数据块并转译为 JSON 格式输出

---

### 2. RequestLogService
**路径**: `service/RequestLogService.java`  
**职责**: 请求日志记录与 Token 使用量统计（异步处理）

| 方法 | 说明 |
|------|------|
| asyncLogRequest | 异步保存请求日志到数据库 |
| asyncRecordUsage | 异步更新 API Key 的已用 Token 数 |
| truncate | 截断请求/响应体至最大长度（防止大文本占用空间） |

**依赖**: `RequestLogRepository`, `ApiKeyRepository`  
**关键特性**:
- 使用 `@Async` 实现非阻塞日志写入
- 请求体/响应体截断为 MAX_BODY_LENGTH（2000 字符）
- 通过 JPA 的实体关联自动建立 RequestLog → ApiKey 关系

---

### 3. RoutingConfigParser
**路径**: `service/RoutingConfigParser.java`  
**职责**: 路由配置解析（JSON 格式配置）

| 方法 | 说明 |
|------|------|
| resolveModel | 根据 modelMappings 映射模型名称（如 gpt-4 → llama3） |
| resolveTargetUrl | 解析目标 URL，优先级：routingConfig > apiKey.targetUrl > 默认值 |

**依赖**: `ObjectMapper`  
**配置格式示例**:
```json
{
  "modelMappings": {"gpt-4": "llama3"},
  "targetUrl": "http://custom-backend:8080"
}
```

---

### 4. ApiKeyService（安全包内）
**路径**: `security/ApiKeyService.java`  
**职责**: API Key 生成、查找与配额校验

| 方法 | 说明 |
|------|------|
| findByKey / findByKeyNoCache | 根据 Key 值查询 ApiKey 实体 |
| createApiKey | 创建新的 API Key（生成随机密钥） |
| hasEnoughTokens | 检查剩余 Token 是否满足请求需求 |
| recordUsage | 记录 Token 使用量到指定 API Key |

**依赖**: `ApiKeyRepository`  
**关键逻辑**:
- Key 值格式：`nkey_` + Base64 URL-Safe 编码（32 字节随机数）
- Token 配额检查：无限制（null）或剩余 ≥ 所需量

---

### 5. UserBalanceService
**路径**: `service/UserBalanceService.java`  
**职责**: 用户余额管理与成本计算

| 方法 | 说明 |
|------|------|
| getBalance | 获取用户当前余额 |
| estimateCost | 估算请求成本（输入/输出 Token × 单价 ÷ 百万） |
| freezeBalance | 冻结余额（流式请求预检查） |
| deductBalance | 扣减余额（带乐观锁重试） |
| refundBalance | 退款/增加余额 |
| settleBalance | 结算（实际扣费） |
| adjustBalance | 管理员调整用户余额 |
| initializeBalance | 初始化新用户余额 |

**依赖**: `UserRepository`  
**核心机制**:
- 乐观锁控制并发扣费，失败时最多重试 3 次
- 价格单位：元/百万 Token
- 余额字段类型为 BigDecimal，避免浮点精度问题

---

### 6. RequestQueueService
**路径**: `service/RequestQueueService.java`  
**职责**: 请求队列管理（用户维度串行化）

| 方法 | 说明 |
|------|------|
| executeWithQueue | 提交任务到用户专属队列（异步执行器模式） |
| executeSync | 同步执行任务（基于锁对象实现串行化） |
| cleanup | 清理指定用户的队列资源 |
| shutdown | 关闭所有队列和执行器 |

**依赖**: 无外部依赖，使用 `ConcurrentHashMap`, `BlockingQueue`, `ExecutorService`  
**设计目标**:
- 防止同一用户并发请求导致 Token 超扣
- 每个用户拥有独立锁对象实现串行化

---

### 7. UpstreamProviderService
**路径**: `service/UpstreamProviderService.java`  
**职责**: 上游 Provider（后端服务）配置管理与熔断控制

| 方法 | 说明 |
|------|------|
| findById / findAll / findAllEnabled | Provider 查询接口 |
| findByModelName | 根据模型名称匹配可用的 Provider |
| create / update / delete | Provider CRUD 操作 |
| getUpstreamKey | 获取上游 API Key（内部使用，不对外暴露） |
| getSellPriceInput/Output | 获取卖出价格（用户端收费） |
| getBuyPriceInput/Output | 获取买入价格（成本价） |
| recordFailure | 记录失败次数（达到阈值自动禁用） |
| isCircuitOpen | 检查熔断是否打开 |
| resetFailureCount | 重置失败计数（管理员操作） |
| recordSuccess | 记录成功请求，同时重置失败计数 |

**依赖**: `BackendServiceRepository`  
**熔断机制**:
- 连续失败 5 次触发熔断 → Provider 自动禁用
- 5 分钟后自动尝试恢复（通过 isCircuitOpen 检查）

---

### 8. SystemService
**路径**: `service/SystemService.java`  
**职责**: 系统资源监控（CPU、内存、GPU）

| 方法 | 说明 |
|------|------|
| getSystemResources | 获取当前系统资源快照（缓存数据） |
| getCpuUsage | 计算 CPU 使用率（基于 OSHI 库） |
| getMemoryUsage | 计算内存使用率（已用/总量 × 100%） |
| getGpuDataList | 收集 GPU 数据（多源合并：OSHI + nvidia-smi + Windows PowerShell） |

**依赖**: OSHI 库 (`SystemInfo`, `HardwareAbstractionLayer`)  
**平台适配**:
- Linux: DRM 接口读取 GPU 信息 + `nvidia-smi` 命令
- Windows: PowerShell 执行 CIM/WMI 查询 + `nvidia-smi.exe`
- GPU 数据合并策略：按设备标识去重，优先使用精确数值

---

## Service 层核心设计模式

| 模式 | 应用场景 |
|------|----------|
| **异步处理** | RequestLogService 的日志记录（@Async） |
| **乐观锁重试** | UserBalanceService.deductBalance (OptimisticLockingFailureException) |
| **命令模式** | RequestQueueService 将任务封装为 Callable/Runnable |
| **策略模式** | RoutingConfigParser 根据不同配置动态解析路由 |
| **熔断器模式** | UpstreamProviderService 的 recordFailure/isCircuitOpen |
| **缓存优化** | SystemService 每 1 秒刷新一次资源数据，避免频繁查询 |

---

## 关键业务流程

### LLM 请求转发流程（LlmController → Service）
```
用户发起聊天请求
    ↓
LlmController.chat()
    ↓
1. ApiKeyAuthenticationFilter 验证 API Key → 设置 request.setAttribute("apiKey")
2. LlmForwardService.estimateTokenUsage(输入) → 预估 Token
3. ApiKeyService.hasEnoughTokens(key, estimatedInput) → 配额检查
4. RoutingConfigParser.resolveTargetUrl() / resolveModel() → 解析目标 URL 与模型
5. LlmForwardService.forwardChatRequest() → 转发请求
6. RequestLogService.asyncRecordUsage() → 异步扣减 Token
7. RequestLogService.asyncLogRequest() → 异步记录日志
    ↓
返回响应给客户端
```

### Provider 熔断流程（UpstreamProviderService）
```
请求转发失败
    ↓
recordFailure(providerId)
    ↓
failureCount +1
    ↓
判断：failureCount ≥ CIRCUIT_FAILURE_THRESHOLD (5)?
    ├─ Yes: provider.setEnabled(false)，触发熔断
    └─ No: 继续正常服务
    ↓
下次请求时 isCircuitOpen(providerId) 检查：
    ├─ 已禁用 → 返回 true（拒绝请求）
    ├─ failureCount < 5 → 返回 false（允许请求）
    └─ lastFailureAt > 5 分钟前 → resetFailureCount()，尝试恢复
```

---

## 常见修改定位

| 问题类型 | 优先检查 Service |
|----------|------------------|
| LLM 转发失败 | LlmForwardService.forwardChatRequest / forwardNonStreaming |
| Token 扣减不准 | RequestLogService.asyncRecordUsage / ApiKeyService.recordUsage |
| 用户余额异常 | UserBalanceService.deductBalance (乐观锁重试逻辑) |
| Provider 频繁熔断 | UpstreamProviderService.CIRCUIT_FAILURE_THRESHOLD 阈值配置 |
| GPU 数据未获取 | SystemService.getWindowsGpuDataList() / getLinuxGpuDataList() 平台分支 |
