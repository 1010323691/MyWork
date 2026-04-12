# Config Layer - Configuration Classes

## 概述
配置层包含 Spring Boot 应用的各种配置类、安全配置和异步处理配置。

## 核心配置文件

### application.yml
**文件**: src/main/resources/application.yml
- **数据库配置**:
  - spring.datasource.url: MySQL 连接 URL
  - spring.datasource.username/password: 数据库凭据
  - spring.jpa.hibernate.ddl-auto: JPA schema 管理策略 (update)
  - spring.jpa.open-in-view: false (关闭 OVIV)

- **服务器配置**:
  - server.port: 

- **Thymeleaf 配置**:
  - spring.thymeleaf.cache: true
  - spring.web.resources.cache.period: 3600

- **网关配置 (gateway.*)**:
  - gateway.default-backend-url: 默认后端 URL
  - gateway.concurrent.max-requests: 网关总并发上限，超出后排队等待
  - gateway.apikey.max-concurrent-requests: 单 API Key 并发上限，超出后排队等待
  - gateway.forward.connect-timeout-seconds: 30
  - gateway.forward.read-timeout-seconds: 60
  - gateway.async.request-timeout-ms: 180000

- **安全配置 (app.security.*)**:
  - app.security.swagger-enabled: false
  - app.security.allowed-origin-patterns: CORS 允许源列表
  - app.security.protection.*: 登录/注册/API 写操作的轻量防刷配置

### application-prod.yml
**文件**: `src/main/resources/application-prod.yml`
- `prod` 环境下日志文件根目录为 `/var/log/llm-gateway`
- 配合 `logback-spring.xml` 自动生成 `yyyy/MM` 目录
- 应用日志文件格式：`yyyyMMdd_app.log`
- 错误日志文件格式：`yyyyMMdd_error.log`

### logback-spring.xml
**文件**: `src/main/resources/logback-spring.xml`
- 使用 `prod` profile 切换到文件日志
- 非 `prod` 环境保持控制台输出
- 非 `prod` 控制台编码默认跟随 `file.encoding`，也可通过 `LOG_CONSOLE_CHARSET` 覆盖
- 应用日志采用对齐字段格式，便于扫描时间、级别、线程、类名和消息
- 错误日志独立输出完整异常堆栈，避免主日志文件被堆栈刷屏

## Java 配置类

### SecurityConfig
**文件**: SecurityConfig.java
- **职责**: Spring Security 核心配置
- **关键组件**:
  - @Configuration + @EnableWebSecurity + @EnableMethodSecurity
  - SecurityFilterChain Bean: HTTP 安全配置
  - PasswordEncoder Bean: BCryptPasswordEncoder
  - DaoAuthenticationProvider Bean: 基于数据库的用户认证
  - CorsConfigurationSource Bean: CORS 跨域配置

- **安全规则**:
  - /api/auth/login, /api/auth/register: 公开
  - /api/admin/*: 需要 ADMIN 角色
  - /api/llm/*, /v1/*: 需要认证 (API Key)
  - /dashboard, /logs: 需要 USER 认证
  - Swagger UI: 可配置启用/禁用

- **CORS 配置**:
  - allowedOriginPatterns: 支持通配符的源列表
  - allowedMethods: GET, POST, PUT, PATCH, DELETE, OPTIONS
  - allowCredentials: true (允许携带 Cookie)

### ApiKeyAuthenticationFilter
**文件**: ApiKeyAuthenticationFilter.java
- **职责**: API Key 认证过滤器（拦截器）
- **工作流程**:
  1. 从请求头 X-API-Key 提取密钥值
  2. 调用 ApiKeyService.validateApiKey() 验证
  3. 将 ApiKey entity 存入 request.setAttribute("apiKey")
  4. 如果验证失败：返回 401 Unauthorized
- **跳过路径**: /api/auth/*, /actuator/*, /login, /register, 静态资源等

### SecurityProtectionFilter
**文件**: `SecurityProtectionFilter.java`
- **职责**: 轻量防刷过滤器，优先拦截高频登录、注册和高成本写请求
- **防护范围**:
  - `POST /api/auth/login`: 按 IP 做分钟级限流
  - `POST /api/auth/register`: 按 IP 做更严格限流
  - `POST /api/llm/chat`、`POST /v1/chat/completions`: 按 API Key / 用户 / IP 限流
  - 其他 `POST/PUT/PATCH/DELETE` 的 `/api/**`、`/v1/**`: 通用写操作限流
- **返回**:
  - 命中限流时返回 `429 Too Many Requests`
  - 响应体包含 `retryAfterSeconds`

### SecurityThrottleService
**文件**: `SecurityThrottleService.java`
- **职责**: 维护单机内存版限流窗口和登录失败锁定状态
- **登录防爆破**:
  - 同时按 `IP` 和 `username` 统计失败次数
  - 达到阈值后在锁定窗口内拒绝登录
  - 登录成功后清空对应失败计数和锁定

### WebMvcAsyncConfig
**文件**: WebMvcAsyncConfig.java
- **职责**: 异步请求配置
- **注解**: @Configuration + @EnableAsync
- **线程池配置** (从 application.yml 读取):
  - corePoolSize: 8
  - maxPoolSize: 32
  - queueCapacity: 200
  - threadNamePrefix: "async-executor-"

### AdminUserBootstrapService
**文件**: `AdminUserBootstrapService.java`
- **职责**: 应用启动后检查管理员账号是否存在
- **初始化逻辑**:
  - 当数据库中不存在 `ADMIN` 角色用户时，自动补齐一个管理员账号
  - 默认用户名固定为 `admin`
  - 初始密码取 `spring.datasource.password` / `DB_PASSWORD`，并通过 `PasswordEncoder` 做 BCrypt 加密后入库
  - 如果 `admin` 用户名已存在但还不是管理员，则提升为 `ADMIN` 并重置为初始化密码

## 环境变量覆盖

所有配置支持通过环境变量覆盖：
`ash
SERVER_PORT=9090
DB_URL=jdbc:mysql://prod-server:3306/llm_gateway
DB_USERNAME=prod_user
DB_PASSWORD=prod_password
GATEWAY_DEFAULT_BACKEND_URL=http://ollama-prod:11434
APP_SECURITY_SWAGGER_ENABLED=true
`

## 配置类依赖关系

`
LlmGatewayApplication (@SpringBootApplication)
       |
       +-> SecurityConfig (安全配置)
       |      |
       |      +-> ApiKeyAuthenticationFilter (API Key 过滤器)
       |      +-> SecurityProtectionFilter (防刷过滤器)
       |      +-> CustomUserDetailsService (用户详情服务)
       |
       +-> WebMvcAsyncConfig (异步配置)
`

## 修改指南

- **调整安全规则**: SecurityConfig.securityFilterChain() -> authorizeHttpRequests()
- **添加新的过滤逻辑**: 创建新的 Filter Bean，使用 addFilterBefore/After
- **修改 CORS 策略**: SecurityConfig.corsConfigurationSource() -> allowedOriginPatterns
- **优化异步性能**: WebMvcAsyncConfig + application.yml gateway.async.*
