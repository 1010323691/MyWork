# LLM Gateway 项目索引

## 项目概述

**项目名称**: LLM Gateway（大语言模型网关）  
**技术栈**: Spring Boot + Thymeleaf + MySQL + Spring Security (Session/Cookie)
**端口**: 8080  

这是一个用于统一管理多个 LLM 后端服务的网关系统，提供 API Key 管理、Token 配额控制、请求转发、使用量统计等功能。

---

## 目录结构

```
/ai-context/
├── index.md          # 全局索引（本文件）
├── entity.md         # 实体类文档
├── controller.md     # Controller 层文档
├── service.md        # Service 层文档  
├── repository.md     # Repository 层文档
├── security.md       # 安全认证模块文档
└── ui.md            # 前端页面文档
```

---

## 模块说明与导航

| 文档 | 职责 | 包含内容 |
|------|------|----------|
| [entity.md](./entity.md) | 数据模型定义 | User、ApiKey、RequestLog、BackendService |
| [controller.md](./controller.md) | HTTP 接口层 | Auth、User、ApiKey、Llm、Admin 等控制器 |
| [service.md](./service.md) | 业务逻辑层 | Token 配额、请求转发、日志记录、路由配置 |
| [repository.md](./repository.md) | 数据访问层 | JPA Repository 接口定义 |
| [security.md](./security.md) | 安全认证模块 | Session/Cookie 认证、API Key 验证、密码加密 |
| [ui.md](./ui.md) | 前端页面 | 登录、注册、Dashboard、管理员页面 |

---

## 核心流程图

### 1. LLM 请求转发流程（核心）
```
客户端 → ApiKeyAuthenticationFilter(验证 API Key) 
      → LlmController.chat()
      → RoutingConfigParser(解析路由配置)
      → LlmForwardService(forwardChatRequest)
      → 后端 OLLAMA/VLLM 服务
      → RequestLogService(记录日志 + 扣减 Token)
```

### 2. 用户认证流程（Session/Cookie）
```
用户名/密码登录 → AuthController.login()
              → AuthenticationManager.authenticate()
              → HttpSessionSecurityContextRepository.saveContext()
              → Spring 设置 JSESSIONID Cookie
              → 后续请求自动携带 Cookie 进行认证
```

---

## 快速修改指引

| 问题类型 | 优先查看文档 |
|----------|-------------|
| API Key 相关问题 | [entity.md](./entity.md) + [controller.md](./controller.md) |
| Session 认证失败 | [security.md](./security.md) |
| Token 扣减逻辑 | [service.md](./service.md) |
| LLM 转发错误 | [service.md](./service.md) - LlmForwardService |
| 前端页面样式 | [ui.md](./ui.md) |
| 数据库查询问题 | [repository.md](./repository.md) |

---

## 任务执行流程

1. **阅读本文件**：确定涉及模块
2. **查阅对应文档**：查看具体实现细节
3. **修改代码文件**：根据需求进行修改
4. **同步更新文档**：如结构变更需同步更新 ai-context 文档
5. **提交 Git**：执行 git commit
