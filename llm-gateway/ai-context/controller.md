# Controller Layer - REST API Endpoints

## 概述
控制器层负责定义 HTTP 端点、协议适配和权限边界。当前已经把部分重复逻辑下沉到 `LogQueryService`、`ApiKeyResponseMapper` 和余额流水服务，Controller 本身尽量保持轻量。

## Controller 分类

### 1. 认证相关
**文件**: `AuthController.java`
- `POST /api/auth/login` 用户登录
- `POST /api/auth/register` 用户注册
- `GET /api/auth/me` 获取当前登录用户

### 2. 网关接口
**文件**: `LlmController.java`
- `POST /api/llm/chat` 传统聊天接口
- `GET /api/llm/models` 获取可用模型
- 已接入上游熔断状态检查、余额预检、结算和日志记录

**文件**: `OpenAiCompatibleController.java`
- `POST /v1/chat/completions` OpenAI 兼容接口
- 支持流式和非流式
- 已接入上游熔断状态检查、余额预检、结算和日志记录

### 3. API Key 管理
**文件**: `ApiKeyController.java`
- `GET /api/apikeys`
- `POST /api/apikeys`
- `PUT /api/apikeys/{id}/toggle`
- `DELETE /api/apikeys/{id}`
- 兼容旧入口：`/api/admin/apikeys` 仍然映射到同一控制器

### 4. 用户侧接口
**文件**: `UserController.java`
- `GET /api/user/logs` 当前用户日志分页查询
- `GET /api/user/logs/{id}` 当前用户单条日志详情
- `GET /api/user/stats` 当前用户统计

**文件**: `UserBalanceController.java`
- `GET /api/balance/current` 当前用户余额
- `GET /api/balance/transactions` 当前用户余额流水
- `GET /api/balance/user/{userId}` 管理员查看指定用户余额
- `PUT /api/balance/admin/user/{userId}` 管理员调账
- `POST /api/balance/estimate` 费用估算

### 5. Dashboard 与监控
**文件**: `DashboardController.java`
- `GET /api/dashboard/summary` 仪表板汇总数据

**文件**: `AdminController.java`
- `GET /api/admin/users` 用户分页查询
- `PUT /api/admin/users/{id}/toggle` 启用或停用用户
- `DELETE /api/admin/users/{id}` 删除用户
- `PUT /api/admin/keys/{id}` 管理员更新 API Key 附加配置
- `GET /api/admin/monitor` 系统监控汇总

**文件**: `AdminLogController.java`
- `GET /api/admin/logs` 管理员日志分页查询
- `GET /api/admin/logs/{id}` 管理员查看单条日志

**文件**: `AdminProviderController.java`
- `GET /api/admin/providers`
- `POST /api/admin/providers`
- `PUT /api/admin/providers/{id}`
- `DELETE /api/admin/providers/{id}`
- `POST /api/admin/providers/{id}/connectivity-test`

### 6. 页面路由
**文件**: `ViewController.java`
- `/login`, `/register`
- `/dashboard`
- `/apikeys`
- `/logs`
- `/user/balance`
- `/admin/users`
- `/admin/providers`
- `/admin/monitor`

## 当前调用链

### OpenAI 兼容调用
1. `ApiKeyAuthenticationFilter` 做 API Key 认证
2. `OpenAiCompatibleController` 解析模型和参数
3. `RoutingConfigParser` 解析路由
4. `UpstreamProviderService` 查找上游并检查熔断
5. `UserBillingService` 做余额预检与结算
6. `OpenAiForwardService` 发起转发
7. `RequestLogService` 异步写日志
8. `BalanceTransactionService` 记录扣费流水

### 日志查询
1. `UserController` / `AdminLogController` 接收分页与筛选参数
2. 统一委托 `LogQueryService`
3. `LogQueryService` 构建查询条件并返回 `RequestLogResponse`

### 余额流水
1. `UserBalanceController` 暴露余额与流水接口
2. `UserBalanceService` 负责扣费和调账
3. `BalanceTransactionService` 负责保存与查询金额变动明细

## 修改指南
- 新增网关协议：优先参考 `LlmController` 与 `OpenAiCompatibleController`
- 新增日志筛选条件：优先修改 `LogQueryService`
- 新增资金明细逻辑：优先修改 `UserBalanceService` 和 `BalanceTransactionService`
