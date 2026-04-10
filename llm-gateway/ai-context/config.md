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
  - gateway.forward.connect-timeout-seconds: 30
  - gateway.forward.read-timeout-seconds: 300
  - gateway.async.request-timeout-ms: 300000

- **安全配置 (app.security.*)**:
  - app.security.swagger-enabled: false
  - app.security.allowed-origin-patterns: CORS 允许源列表

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

### WebMvcAsyncConfig
**文件**: WebMvcAsyncConfig.java
- **职责**: 异步请求配置
- **注解**: @Configuration + @EnableAsync
- **线程池配置** (从 application.yml 读取):
  - corePoolSize: 8
  - maxPoolSize: 32
  - queueCapacity: 200
  - threadNamePrefix: "async-executor-"

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
       |      +-> CustomUserDetailsService (用户详情服务)
       |
       +-> WebMvcAsyncConfig (异步配置)
`

## 修改指南

- **调整安全规则**: SecurityConfig.securityFilterChain() -> authorizeHttpRequests()
- **添加新的过滤逻辑**: 创建新的 Filter Bean，使用 addFilterBefore/After
- **修改 CORS 策略**: SecurityConfig.corsConfigurationSource() -> allowedOriginPatterns
- **优化异步性能**: WebMvcAsyncConfig + application.yml gateway.async.*
