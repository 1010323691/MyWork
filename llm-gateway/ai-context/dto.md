# DTO Layer - Data Transfer Objects

## 请求 DTO

### `AuthRequest`
- 用户登录

### `RegisterRequest`
- 用户注册

### `ChatRequest`
- 传统聊天接口请求
- 字段: `model`, `messages`, `stream`

### `ApiKeyRequest`
- API Key 创建/更新请求
- 字段: `name`, `expiresAtDays`, `targetUrl`, `routingConfig`

## 响应 DTO

### `ApiKeyResponse`
- API Key 信息
- 字段: `id`, `apiKeyValue`, `name`, `usedTokens`, `enabled`, `expiresAt`, `createdAt`, `lastUsedAt`, `targetUrl`, `routingConfig`, `userId`

### `DashboardSummaryResponse`
- 仪表板汇总响应

### `RequestLogResponse`
- 请求日志响应
- 字段: `id`, `requestId`, `userId`, `model`, `inputTokens`, `outputTokens`, `costAmount`, `latencyMs`, `status`, `createdAt`

### `SystemMonitorResponse`
- 系统监控响应

### `ProviderDTO`
- 上游供应商响应
- 字段包含 `sellPriceInput`, `sellPriceOutput`, `buyPriceInput`, `buyPriceOutput`

## 映射关系

| Entity | 对应 DTO |
|--------|----------|
| `User` | `AuthRequest`, `RegisterRequest` |
| `ApiKey` | `ApiKeyRequest`, `ApiKeyResponse` |
| `BackendService` | `ProviderDTO` |
| `RequestLog` | `RequestLogResponse` |
