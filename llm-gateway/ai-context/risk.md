# Risk Points - 潜在风险与注意事项

## 概述
本文档列出项目中的关键风险点、强耦合区域和修改时需要特别小心的逻辑。

## 🔴 高风险区域

### 1. Token 配额检查与扣减
**文件**: ApiKeyService.java, RequestLogService.java
- **风险**: Token 扣减不一致可能导致余额错误
- **问题场景**:
  - 请求失败但已扣除 Token
  - 并发请求导致重复扣减
  - 异步记录丢失
- **建议**:
  - 使用数据库事务保证原子性
  - 考虑乐观锁 (@Version) 防止并发冲突
  - 添加补偿机制（对账任务）

### 2. API Key 认证安全
**文件**: ApiKeyAuthenticationFilter.java, ApiKeyService.java
- **风险**: API Key 泄露或伪造
- **问题场景**:
  - API Key 未加密存储（当前明文存储在数据库）
  - 未实施速率限制，可能被暴力破解
- **建议**:
  - 考虑对 API Key 值进行哈希存储
  - 添加请求频率限制 (Rate Limiter)
  - 记录失败的认证尝试日志

### 3. Session 管理
**文件**: AuthController.java, SecurityConfig.java
- **风险**: Session 固定攻击、未正确失效
- **问题场景**:
  - 登录后未生成新的 Session ID
  - 登出后 Session 未及时失效
- **当前实现**: 使用 HttpSessionSecurityContextRepository 保存 SecurityContext
- **建议**:
  - 验证登出逻辑是否完全清除 Session
  - 考虑添加 Session 超时配置

## 🟡 中风险区域

### 4. 异步日志记录丢失
**文件**: RequestLogService.java
- **风险**: @Async 方法异常可能导致日志丢失
- **问题场景**:
  - 线程池满时任务被拒绝
  - 数据库连接失败时未重试
- **建议**:
  - 添加 @Retryable 重试机制
  - 使用消息队列缓冲日志（如 Redis List）
  - 监控异步任务失败率

### 5. 上游服务故障传播
**文件**: LlmForwardService.java, OpenAiForwardService.java
- **风险**: 后端 LLM 服务不可用导致网关雪崩
- **问题场景**:
  - 无熔断机制，所有请求堆积
  - 超时时间过长占用连接池
- **建议**:
  - 添加熔断器 (Resilience4j)
  - 实现健康检查与自动剔除
  - 配置合理的超时和重试策略

### 6. SQL 注入风险
**文件**: 所有 Repository 自定义查询
- **风险**: 使用原生 SQL 时可能引入注入漏洞
- **当前状态**: 主要使用 JPA 安全 API，风险较低
- **建议**:
  - 避免使用 @Query 写拼接 SQL
  - 如需复杂查询，使用参数化查询

## 🟢 低风险但需注意

### 7. 并发性能瓶颈
**文件**: WebMvcAsyncConfig.java
- **风险**: 高并发下线程池耗尽
- **当前配置**: core=8, max=32, queue=200
- **建议**:
  - 根据实际负载调整参数
  - 监控线程池使用率
  - 考虑使用响应式栈 (WebFlux) 提升并发能力

### 8. 数据库连接池耗尽
**文件**: pplication.yml (Spring Boot 默认 HikariCP)
- **风险**: 大量并发请求导致连接不足
- **建议**:
  - 监控 HikariCP 指标 (通过 Actuator)
  - 调整 maximum-pool-size (默认 10)
  - 设置合理的 connection-timeout

### 9. Token 估算不准确
**文件**: LlmForwardService.java - estimateTokenUsage()
- **风险**: 预估 Token 与实际消耗差异大
- **问题场景**:
  - 用户实际使用超过配额
  - 余额计算偏差
- **建议**:
  - 使用更精确的 Tokenizer (如 tiktoken)
  - 预留缓冲（如按 1.2 倍预估）

## 🔗 强耦合区域

### 10. Controller -> Service 紧耦合
- **现状**: Controller 直接依赖具体 Service 实现
- **影响**: 难以替换或扩展 Service
- **建议**: 
  - 保持当前设计（Spring DI 已解耦）
  - 如需测试，使用 @MockBean

### 11. OpenAI 协议硬编码
**文件**: OpenAiForwardService.java
- **现状**: 请求/响应格式硬编码为 OpenAI 格式
- **影响**: 适配其他协议需要大量修改
- **建议**:
  - 提取 ProtocolAdapter 接口
  - 实现 OllamaAdapter, VllmAdapter 等

## 📋 修改检查清单

在修改以下文件前，请务必：

| 文件 | 检查项 |
|------|--------|
| ApiKeyService.java | 验证 Token 扣减事务、并发测试 |
| SecurityConfig.java | 验证所有端点权限、CORS 策略 |
| RequestLogService.java | 验证异步任务不丢失、线程池配置 |
| OpenAiForwardService.java | 验证流式响应完整性、错误处理 |
| application.yml | 备份原配置、测试环境隔离 |

## 🧪 测试建议

- **单元测试**: Service 层核心逻辑（Token 计算、路由解析）
- **集成测试**: API 端点完整流程（认证 -> 转发 -> 日志）
- **压力测试**: 并发请求下的 Token 扣减一致性
- **安全测试**: SQL 注入、XSS、CSRF、越权访问
