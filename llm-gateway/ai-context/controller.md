# Controller Layer - REST API Endpoints

## 概述
控制器层负责处理 HTTP 请求，定义所有 API 端点路由。本项目采用 Spring MVC 架构，使用@RestController 注解。

## 核心入口文件
- LlmGatewayApplication.java - Spring Boot 应用主入口

## Controller 分类与职责

### 1. 认证相关 (Authentication)
**文件**: AuthController.java
- POST /api/auth/login - 用户登录（Session 认证）
- POST /api/auth/register - 新用户注册
- GET /api/auth/me - 获取当前登录用户信息

### 2. LLM API (核心业务)
**文件**: LlmController.java
- POST /api/llm/chat - 传统聊天接口（非流式）
- GET /api/llm/models - 列出可用模型列表

**文件**: OpenAiCompatibleController.java
- POST /v1/chat/completions - OpenAI 兼容接口（支持流式/非流式）

### 3. API Key 管理
**文件**: ApiKeyController.java
- GET /api/apikeys - 列出 API Key
  - ADMIN: 可查看全部，支持 `userId` 过滤
  - USER: 只能查看自己的 API Key
- POST /api/apikeys - 创建 API Key
  - ADMIN: 可为指定 `userId` 创建
  - USER: 只能为自己创建
- PUT /api/apikeys/{id}/toggle - 切换 API Key 启用状态
  - ADMIN: 可操作任意 Key
  - USER: 只能操作自己的 Key
- DELETE /api/apikeys/{id} - 删除 API Key
  - ADMIN: 可删除任意 Key
  - USER: 只能删除自己的 Key

### 4. 用户管理
**文件**: UserController.java
- GET /api/users/{id}/balance - 获取用户余额
- POST /api/users/{id}/balance - 充值用户余额

**文件**: UserBalanceController.java
- 用户余额相关操作

### 5. Dashboard & 监控
**文件**: DashboardController.java
- GET /api/dashboard/summary - 获取仪表板汇总数据
- GET /api/dashboard/stats/users - 用户统计
- GET /api/dashboard/stats/tokens - Token 使用趋势
- GET /api/dashboard/system/monitor - 系统监控信息

**文件**: ViewController.java
- Web 页面路由（Thymeleaf）
- /apikeys - API Key 页面（ADMIN/USER 共用）
- /dashboard - 仪表板页面（USER 访问时重定向到 /apikeys）
- /login, /register - 登录注册页面
- /admin/* - 管理后台页面

### 6. 管理员功能 (ADMIN 角色)
**文件**: AdminController.java
- GET /api/admin/users - 列出所有用户
- PUT /api/admin/users/{id} - 更新用户信息
- DELETE /api/admin/users/{id} - 删除用户
- POST /api/admin/users/{id}/enable - 启用/禁用用户

**文件**: AdminProviderController.java
- GET /api/admin/providers - 列出后端服务提供者
- POST /api/admin/providers - 添加新的后端服务
- PUT /api/admin/providers/{id} - 更新后端服务配置
- DELETE /api/admin/providers/{id} - 删除后端服务
- POST /api/admin/providers/{id}/connectivity-test - 测试连接性

**文件**: AdminLogController.java
- GET /api/admin/logs - 查询请求日志（分页）
- GET /api/admin/logs/{id} - 获取单条日志详情

### 7. 客户端 API
**文件**: ClientController.java
- 面向客户端的辅助接口

## 调用链示例

### LLM Chat 请求流程
`
用户请求 POST /v1/chat/completions
  -> OpenAiCompatibleController.chatCompletions()
    -> ApiKeyAuthenticationFilter (认证)
      -> apiKeyService.validateApiKey()
    -> routingConfigParser.resolveModel() (路由解析)
    -> upstreamProviderService.findByModelName() (查找后端)
    -> openAiForwardService.forwardRequest() (转发请求)
    -> requestLogService.asyncRecordUsage() (记录使用量)
    -> 返回响应
`

### 用户登录流程
`
用户提交 POST /api/auth/login
  -> AuthController.login()
    -> authenticationManager.authenticate()
      -> CustomUserDetailsService.loadUserByUsername()
    -> SecurityContext 保存到 Session
    -> 返回成功消息
`

## API 端点汇总表

| 路径 | 方法 | 认证方式 | 角色要求 | 说明 |
|------|------|----------|----------|------|
| /api/auth/login | POST | None | - | 用户登录 |
| /api/auth/register | POST | None | - | 用户注册 |
| /api/auth/me | GET | Session | USER | 获取当前用户 |
| /api/llm/chat | POST | API Key | - | LLM 聊天（传统） |
| /v1/chat/completions | POST | API Key | - | OpenAI 兼容接口 |
| /api/apikeys | GET,POST | Session | USER | API Key 列表与创建 |
| /api/apikeys/{id}/toggle | PUT | Session | USER | API Key 启停（限本人） |
| /api/apikeys/{id} | DELETE | Session | USER | API Key 删除（限本人） |
| /api/dashboard/* | GET | Session | USER | 仪表板数据 |
| /api/admin/* | All | Session | ADMIN | 管理功能 |

## 修改指南

- **新增 API 端点**: 在对应 Controller 类中添加 @GetMapping/@PostMapping 方法
- **修改认证逻辑**: SecurityConfig.java + ApiKeyAuthenticationFilter.java
- **调整路由规则**: RoutingConfigParser.java
- **添加新的转发后端**: LlmForwardService.java / OpenAiForwardService.java
