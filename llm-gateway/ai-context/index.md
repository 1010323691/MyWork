# LLM Gateway - AI Context 索引

## 工程路径
```
D:\git\GitHub\MyWork\llm-gateway
```

## 项目概述
Spring Boot 3.x API 网关项目，用于转发 LLM 请求到后端服务（Ollama/vLLM），提供 API Key 管理和 Token 配额功能。

## 技术栈
- **后端**: Spring Boot 3.4.1, Spring Security, Spring Data JPA
- **数据库**: MySQL
- **前端**: Thymeleaf 模板 + 原生 JS/CSS
- **认证**: JWT + API Key 双认证
- **工具**: Lombok, SpringDoc (Swagger)

## 任务执行流程（严格按顺序）

1. **阅读 index.md** —— 确定涉及模块
2. **查阅对应模块文档** —— 了解结构和依赖关系
3. **修改代码文件** —— 根据需求修改对应文件
4. **同步更新文档** —— 如涉及结构/方法体/核心实现重大变更，需更新对应模块说明
5. **执行 git 提交**

## 模块速查

| 模块文件 | 职责 |
|---------|------|
| [controller.md](controller.md) | API 接口层（5 个 Controller） |
| [service.md](service.md) | 业务逻辑层（2 个 Service） |
| [repository.md](repository.md) | 数据访问层（3 个 Repository） |
| [entity.md](entity.md) | 实体/DTO 模型（6 个 Entity, 5 个 DTO） |
| [security.md](security.md) | 安全认证模块（JWT/API Key） |
| [ui.md](ui.md) | 前端 UI 层（模板/JS/CSS） |
| [config.md](config.md) | 配置文件和启动类 |
| [risk.md](risk.md) | 潜在风险点和注意事项 |

## 快速定位指南

| 问题类型 | 优先查阅 |
|---------|---------|
| API 接口问题 | controller.md |
| 业务逻辑修改 | service.md |
| 数据库操作 | repository.md + entity.md |
| 认证/授权问题 | security.md |
| 前端页面问题 | ui.md |
| 配置修改 | config.md |
