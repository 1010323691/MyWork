# DTO Layer - Data Transfer Objects

## 概述
DTO 层包含请求/响应数据传输对象，用于 API 接口数据交换。

## 请求 DTO (Request)

### AuthRequest
文件：AuthRequest.java
用途：用户登录请求
字段:
- username: String (@NotBlank)
- password: String (@NotBlank)

### RegisterRequest
文件：RegisterRequest.java
用途：用户注册请求
字段:
- username: String (@NotBlank, @Size(3-50))
- password: String (@NotBlank, @Size(6+))
- email: String (@Email)

### ChatRequest
文件：ChatRequest.java
用途：LLM 聊天请求（传统接口）
字段:
- model: String (模型名称)
- messages: String (JSON 字符串，消息数组)
- stream: Boolean (是否流式)

### ApiKeyRequest
文件：ApiKeyRequest.java
用途：创建 API Key 请求
字段:
- name: String (@NotBlank)
- tokenLimit: Long (可选，NULL=无限制)
- expiresAt: LocalDateTime (可选)
- targetUrl: String (可选，自定义目标 URL)
- routingConfig: String (可选，路由配置 JSON)

## 响应 DTO (Response)

### ApiKeyResponse
文件：ApiKeyResponse.java
用途：API Key 信息响应
字段:
- id: Long
- apiKeyValue: String (仅创建时返回一次)
- name: String
- tokenLimit: Long
- usedTokens: Long
- remainingTokens: Long
- enabled: Boolean
- expiresAt: LocalDateTime

### DashboardSummaryResponse
文件：DashboardSummaryResponse.java
用途：仪表板汇总数据
字段:
- totalUsers: Long
- totalApiKeys: Long
- totalRequestsToday: Long
- totalTokensUsedToday: Long

### RequestLogResponse
文件：RequestLogResponse.java
用途：请求日志响应
字段:
- id: Long
- requestId: String
- model: String
- inputTokens: Long
- outputTokens: Long
- latencyMs: Long
- status: String
- createdAt: LocalDateTime

### SystemMonitorResponse
文件：SystemMonitorResponse.java
用途：系统监控数据
字段:
- cpuPercent: Double
- memoryPercent: Double
- diskPercent: Double
- uptimeSeconds: Long

## DTO 与 Entity 映射关系

| Entity | 对应 DTO |
|--------|----------|
| User | AuthRequest, RegisterRequest |
| ApiKey | ApiKeyRequest, ApiKeyResponse |
| BackendService | ProviderDTO |
| RequestLog | RequestLogResponse |

## 修改指南
- 新增字段：在 DTO 添加字段 + Lombok @Data/@Builder
- 添加验证：使用 jakarta.validation 注解
