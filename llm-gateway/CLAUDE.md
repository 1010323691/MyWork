# CLAUDE.md

本文件为 Claude Code 在处理此 LLM Gateway 仓库时提供参考指南。

## 项目概述

LLM Gateway (大语言模型网关) - 智能 API 网关，将 LLM 请求代理到后端推理服务 (Ollama/vLLM)，支持 API Key 管理、基于余额的计费系统和集中式管理控制台。

## 技术栈

- **后端**: Spring Boot 3.4.1, Java 17, Spring Security, Spring Data JPA, Spring WebClient
- **数据库**: MySQL 8.0+
- **前端**: Thymeleaf (服务端渲染), 原生 JavaScript
- **API 文档**: SpringDoc/OpenAPI (Swagger UI)
- **构建工具**: Maven

## 常用开发任务

### 构建和运行

```bash
# 构建
mvn clean package

# 运行 (开发环境)
mvn spring-boot:run

# 使用生产环境配置文件运行
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

### 数据库设置

```sql
CREATE DATABASE llm_gateway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'llm_gateway'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON llm_gateway.* TO 'llm_gateway'@'localhost';
FLUSH PRIVILEGES;
```

### 运行测试

```bash
# 运行所有测试
mvn test

# 生成覆盖率报告
mvn test jacoco:report
```

### 访问地址

- **前端仪表盘**: http://localhost:8080/
- **登录页**: http://localhost:8080/login
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **健康检查**: http://localhost:8080/actuator/health
- **API 文档**: http://localhost:8080/v3/api-docs

## 核心文件结构

```
src/
├── main/
│   ├── java/com/nexusai/llm/gateway/
│   │   ├── LlmGatewayApplication.java          ← 主入口
│   │   ├── config/
│   │   │   ├── WebMvcAsyncConfig.java          ← 异步/流式响应配置
│   │   │   └── SecurityConfig.java             ← 安全过滤器、CORS 配置
│   │   ├── controller/
│   │   │   ├── AuthController.java             ← 登录、注册
│   │   │   ├── AdminController.java            ← 管理员操作
│   │   │   ├── DashboardController.java        ← 仪表盘统计
│   │   │   ├── ApiKeyController.java           ← API Key 管理
│   │   │   ├── AdminProviderController.java    ← 服务商管理
│   │   │   ├── LlmController.java              ← 核心 LLM 路由
│   │   │   ├── OpenAiCompatibleController.java ← OpenAI 兼容接口
│   │   │   └── AnthropicCompatibleController.java ← Anthropic 兼容接口
│   │   ├── service/
│   │   │   ├── LlmForwardService.java          ← 核心转发逻辑
│   │   │   ├── UpstreamProviderService.java    ← 服务商 CRUD
│   │   │   ├── UserBillingService.java         ← 计费逻辑
│   │   │   └── RoutingConfigParser.java        ← URL/模型路由解析
│   │   ├── repository/
│   │   │   ├── UserRepository.java
│   │   │   ├── ApiKeyRepository.java
│   │   │   └── BackendServiceRepository.java
│   │   ├── entity/
│   │   │   ├── User.java
│   │   │   ├── ApiKey.java
│   │   │   ├── BackendService.java
│   │   │   └── RequestLog.java
│   │   └── security/
│   │       ├── ApiKeyAuthenticationFilter.java
│   │       └── SecurityProtectionFilter.java
│   ├── resources/
│   │   ├── application.yml                     ← 主配置文件
│   │   ├── application-prod.yml                ← 生产环境配置
│   │   └── templates/                          ← Thymeleaf 模板
│   │       ├── layout/base.html
│   │       └── pages/
│   └── static/js/                              ← 前端 JS
│       ├── common.js                           ← API 客户端工具
│       ├── login.js
│       └── dashboard.js
└── test/
```

## 核心架构

### 请求流程 (LLM 聊天)

```
客户端请求 → 安全过滤器 → OpenAiCompatibleController
   ↓
安全过滤器链:
  1. GatewayRequestLoggingFilter (记录日志)
  2. ApiKeyAuthenticationFilter (验证 API Key)
  3. SecurityProtectionFilter (限流保护)
   ↓
OpenAiCompatibleController.chatCompletions()
   ↓
RoutingConfigParser.resolveTargetUrl()    // 从 Key 配置解析目标 URL
RoutingConfigParser.resolveModel()        // 解析模型名称
   ↓
UpstreamProviderService.findByModelName() // 查找上游服务商
UserBillingService.hasEnoughBalance()     // 检查余额
   ↓
LlmForwardService.forwardChatRequest()    // 转发到上游服务
   ↓
UserBillingService.settleUsage()          // 扣除余额、记录日志
```

### API Key 认证流程

```
请求 → ApiKeyAuthenticationFilter
   ↓
从以下位置提取 API Key(按优先级):
  1. /v1/messages 路径：Authorization: Bearer <token>
  2. X-API-Key 请求头
  3. x-api-key 请求头
  4. Authorization: Bearer <token> (备用)
   ↓
验证:
  - Key 存在且已启用
  - 未过期
  - 属于已认证用户
   ↓
设置请求属性:
  - apiKey = ApiKey 对象
  - keyAuthStatus = 认证状态
```

### 限流分类

| 分类 | 适用路径 | 限流范围 |
|------|----------|----------|
| login-ip | POST /api/auth/login | IP 地址 |
| register-ip | POST /api/auth/register | IP 地址 |
| completion | POST /v1/chat/completions, /v1/messages | API Key/用户/IP |
| write | POST/PUT/DELETE /api/** | API Key/用户/IP |

### 安全分层

1. **CORS 配置**: 可配置来源白名单 (`APP_SECURITY_ALLOWED_ORIGIN_PATTERNS`)
2. **CSRF**: API 端点禁用
3. **会话管理**: IF_REQUIRED(基于会话)
4. **认证过滤器**:
   - ApiKeyAuthenticationFilter
   - SecurityProtectionFilter
5. **授权规则**:
   - `/api/auth/**`: 公开访问
   - `/api/admin/**`: 需要 ADMIN 角色
   - `/api/user/**`: 认证用户
   - `/v1/**`: API Key 认证
   - `/actuator/**`: 需要 ADMIN 角色

## 常见修改场景

### 添加新上游服务商

1. **BackendServiceRepository.java**: 必要时添加自定义查询
2. **UpstreamProviderService.java**: 添加业务逻辑
3. **AdminController.java**: 添加 CRUD 端点
4. **UI 模板**: 添加服务商管理表单
5. **AdminProviderController.java**: 添加新端点

### 修改计费逻辑

- **UserBillingService.java**: 核心计费计算
- **UserBalanceService.java**: 余额操作
- **BalanceTransactionService.java**: 交易记录
- **RequestLog.java**: 更新日志结构
- **BackendService.java**: 更新价格字段

### 添加新的限流规则

1. **SecurityProtectionProperties.java**: 添加新的配置属性
2. **SecurityThrottleService.java**: 实现限流逻辑
3. **SecurityProtectionFilter.java**: 添加条件判断
4. **application.yml**: 添加配置默认值

### 添加新的 API 端点

1. **Controller 层**: 在相应 Controller 添加端点
2. **Service 层**: 添加业务逻辑
3. **SecurityConfig.java**: 在安全规则中添加 URL 模式
4. **SecurityProtectionFilter.java**: 检查是否需要限流
5. **API 映射**: 公共 API 需更新 api-mapping.md

## 已知风险区域

### 1. 计费逻辑分散
- 多个服务处理计费 (UserBillingService、UserBalanceService、LlmForwardService)
- 竞态条件风险：余额检查和扣费是分开的操作
- **解决方案**: 使用数据库事务或乐观锁

### 2. 路由配置解析
- `routingConfig` 以 JSON 字符串形式存储在 API Key 中
- 无 schema 验证，解析失败时静默使用默认值
- **解决方案**: 添加 schema 验证，解析失败时返回错误

### 3. 熔断器状态管理
- 失败计数存储在数据库中
- recordFailure/recordSuccess 无乐观锁保护
- **解决方案**: 添加 version 字段实现乐观锁

### 4. 流式响应处理
- 使用异步线程池 (超时 300 秒)
- Token 统计在流式完成后异步记录，可能丢失数据
- **解决方案**: 优化超时配置，确保日志记录的原子性

### 5. 请求日志耦合
- GatewayRequestLoggingFilter 调用 UpstreamProviderService(业务逻辑在过滤器中)
- **解决方案**: 提取日志逻辑到独立服务，减少过滤器耦合

## 配置文件

### application.yml (开发环境)
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/llm_gateway
    username: root
    password: password
  jpa:
    hibernate:
      ddl-auto: update  # 启动时自动创建表 (开发环境)
```

### application-prod.yml (生产环境)
```yaml
spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3306/llm_gateway
  jpa:
    hibernate:
      ddl-auto: validate  # 表不存在则失败 (生产环境)
management:
  endpoints:
    web:
      exposure:
        include: health,info  # 仅暴露健康检查和信息端点
```

### 环境变量 (生产环境关键配置)
```bash
# 必需
DB_URL=jdbc:mysql://127.0.0.1:3306/llm_gateway?useSSL=false&serverTimezone=UTC
DB_USERNAME=llm_gateway
DB_PASSWORD=your_password

# 推荐配置
GATEWAY_DEFAULT_BACKEND_URL=http://192.168.0.119:1234
APP_SECURITY_ALLOWED_ORIGIN_PATTERNS=https://admin.example.com
GATEWAY_FORWARD_CONNECT_TIMEOUT_SECONDS=30
GATEWAY_FORWARD_READ_TIMEOUT_SECONDS=300
```

## 数据模型

### User (用户)
- `id`, `username`, `password`, `email`
- `enabled` (布尔值), `userRole` (USER/ADMIN)
- `balance` (BigDecimal, 余额)
- `createdAt`, `updatedAt`, `version` (乐观锁)

### ApiKey (API 密钥)
- `id`, `user` (User), `apiKeyValue` (String, 唯一)
- `name`, `usedTokens`, `enabled`, `expiresAt`
- `targetUrl` (可选覆盖), `routingConfig` (JSON 字符串)
- `lastUsedAt`

### BackendService (服务商/提供商)
- `id`, `name`, `baseUrl`, `supportedModels`, `serviceType`
- `enabled`, `timeoutSeconds`, `upstreamKey` (上游认证密钥)
- `buyPriceInput`, `sellPriceInput` (输入 token 价格)
- `buyPriceOutput`, `sellPriceOutput` (输出 token 价格)
- `failureCount`, `lastFailureAt` (熔断器状态)

### RequestLog (请求日志)
- `id`, `apiKey` (ApiKey), `requestId` (唯一)
- `userId` (冗余字段，用于快速查询)
- `inputTokens`, `outputTokens`, `totalInputTokens`, `cachedInputTokens`
- `modelName`, `latencyMs`, `costAmount`, `status` (SUCCESS/ERROR)
- `createdAt`

## 数据库迁移

开发环境 (dev profile) 使用 `ddl-auto=update` 自动创建表。生产环境使用 `ddl-auto=validate` 并通过 SQL 或迁移工具应用 Schema 变更。

### 初始 Schema (MySQL)

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    user_role VARCHAR(20) NOT NULL,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

CREATE TABLE api_keys (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    api_key_value VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    used_tokens BIGINT NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    target_url VARCHAR(500),
    routing_config TEXT,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_api_key_value (api_key_value),
    INDEX idx_user_id (user_id)
);

CREATE TABLE backend_services (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    base_url VARCHAR(500) NOT NULL,
    supported_models VARCHAR(500),
    service_type VARCHAR(20) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    timeout_seconds INT NOT NULL DEFAULT 60,
    upstream_key VARCHAR(255),
    buy_price_input DECIMAL(10,8) NOT NULL DEFAULT 0.00,
    sell_price_input DECIMAL(10,8) NOT NULL DEFAULT 0.00,
    buy_price_output DECIMAL(10,8) NOT NULL DEFAULT 0.00,
    sell_price_output DECIMAL(10,8) NOT NULL DEFAULT 0.00,
    failure_count INT NOT NULL DEFAULT 0,
    last_failure_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enabled (enabled)
);

CREATE TABLE request_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    api_key_id BIGINT NOT NULL,
    request_id VARCHAR(64) NOT NULL,
    user_id BIGINT NOT NULL,
    input_tokens BIGINT NOT NULL,
    output_tokens BIGINT NOT NULL,
    total_input_tokens BIGINT NOT NULL,
    cached_input_tokens BIGINT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    latency_ms BIGINT NOT NULL,
    cost_amount DECIMAL(10,4) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_api_key_id (api_key_id),
    INDEX idx_request_id (request_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

CREATE TABLE balance_transactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,4) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    title VARCHAR(200) NOT NULL,
    detail VARCHAR(1000),
    reference_id VARCHAR(100),
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);
```

## 测试

### 单元测试
- 使用 `mvn test` 运行
- 测试环境使用 H2 内存数据库
- 测试配置文件激活 H2 数据源

### 集成测试
- `mvn spring-boot:test-run`
- 需要本地运行 MySQL
- 可使用测试容器实现更干净的隔离

### 手动测试
```bash
# 1. 测试 API Key 认证
curl -H "X-API-Key: your_api_key" http://localhost:8080/api/apikeys

# 2. 测试 LLM 聊天 (非流式)
curl -X POST http://localhost:8080/api/llm/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"model":"llama3","messages":[{"role":"user","content":"Hello"}],"stream":false}'

# 3. 测试 OpenAI 兼容接口 (流式)
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{"model":"llama3","messages":[{"role":"user","content":"Hello"}],"stream":true}'

# 4. 测试限流 (应返回 429)
curl -H "X-API-Key: your_api_key" http://localhost:8080/api/apikeys
# 快速发送多个请求
```

## 部署清单

- [ ] 设置 `SPRING_PROFILES_ACTIVE=prod`
- [ ] 配置 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`
- [ ] 设置 `GATEWAY_DEFAULT_BACKEND_URL`
- [ ] 配置 `APP_SECURITY_ALLOWED_ORIGIN_PATTERNS`
- [ ] 测试与上游 LLM 服务连通性
- [ ] 验证生产环境 `JPA_DDL_AUTO=validate`
- [ ] 配置 HTTPS (Let's Encrypt)
- [ ] 配置 systemd 服务实现自动重启
- [ ] 设置日志轮转
- [ ] 监控 `JVM_MEMORY_USAGE` 和 `JVM_THREADS_ACTIVE` 指标

## 故障排查

### 服务无法启动
- 检查 `journalctl -u llm-gateway -f` 日志
- 验证 MySQL 连接日志
- 检查 `GATEWAY_DEFAULT_BACKEND_URL` 可访问性

### 限流过严
- 检查 `app.security.protection.login.ipWindowMinutes` 配置
- 增大 `ipWindowMinutes` 或 `ipMaxRequests`
- 考虑将特定 IP 加入白名单

### API Key 无法工作
- 验证 Key 已启用 (`enabled=true`)
- 检查是否过期 (`expiresAt < now`)
- 确认 Key 属于已认证用户
- 检查 API Key 值是否有拼写错误

### 流式响应不工作
- 确认使用 `/v1/chat/completions` (而非 `/api/llm/chat`)
- 检查请求体中 `stream=true`
- 验证上游服务支持流式响应
- 检查服务器超时设置

### 仪表盘不显示统计
- 检查 `request_logs` 表是否有最近数据
- 验证 `requestLogsRepository` 查询正确性
- 检查 `created_at` 字段索引

---

*最后更新：项目 v0.3.0 (2024-10-13)*
