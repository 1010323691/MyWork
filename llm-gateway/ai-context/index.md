# LLM Gateway - 项目文档索引

## 工程路径
```
d:\projectPath\MyWork\llm-gateway
```

## 项目概述
基于 Spring Boot 的 LLM 网关服务，提供 API Key 管理、Token 配额控制、请求转发和日志记录功能。采用 Session/Cookie 认证模式，支持双认证方式（Session 认证和 API Key 认证）。

## 技术栈
- **后端**: Spring Boot 3.x, Spring Security, Spring Data JPA
- **数据库**: MySQL/PostgreSQL
- **前端**: Thymeleaf, Vanilla JavaScript, ECharts
- **HTTP 客户端**: WebClient (Reactor)

## 任务执行流程
1. 先阅读 `index.md`，确定涉及模块
2. 在对应模块文档中查阅结构/修改对应代码文件（若无必要无需查阅无关文档）
3. 如涉及结构、方法体或核心实现重大变更，则需要同步更新 `/ai-context/` 对应模块说明
4. **执行 git 提交**（若环境不支持 git：必须输出完整 commit 命令 + 提交说明，供人工执行）

## 模块文档导航

| 文档 | 职责 | 适用场景 |
|------|------|----------|
| [controller.md](controller.md) | Controller 层 API 端点定义 | 修改 API 接口、添加新端点、修改请求/响应格式 |
| [service.md](service.md) | Service 层业务逻辑 | 修改业务逻辑、转发规则、Token 计算、路由配置 |
| [repository.md](repository.md) | Repository 层数据访问 | 修改数据库查询、添加新查询方法、优化 SQL |
| [entity.md](entity.md) | Entity 层数据模型 | 修改数据库表结构、添加字段、修改关联关系 |
| [security.md](security.md) | 安全认证配置 | 修改认证逻辑、权限控制、CORS 配置 |
| [ui.md](ui.md) | 前端页面与交互 | 修改页面布局、添加新功能、修改交互逻辑 |

## 快速定位

### 按功能模块定位
- **用户注册/登录**: `controller.md` (AuthController) → `security.md` (CustomUserDetailsService)
- **API Key 管理**: `controller.md` (ApiKeyController) → `service.md` (ApiKeyService)
- **LLM 请求转发**: `controller.md` (LlmController) → `service.md` (LlmForwardService)
- **请求日志**: `controller.md` (UserController) → `repository.md` (RequestLogRepository)
- **用户/管理员权限**: `security.md` (SecurityConfig)

### 按修改类型定位
- **新增 API 端点** → `controller.md`
- **修改业务逻辑** → `service.md`
- **修改数据库查询** → `repository.md`
- **修改表结构** → `entity.md`
- **修改权限控制** → `security.md`
- **修改页面** → `ui.md`
