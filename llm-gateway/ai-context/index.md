# LLM Gateway - AI Context Index

工程路径：D:\projectPath\MyWork\llm-gateway

## 模块文档导航

### 后端模块 (Spring Boot)
- controller.md: REST API 控制器层，定义所有 HTTP 端点路由
- service.md: 业务逻辑层，处理核心网关转发、认证、统计等
- repository.md: 数据访问层，JPA Repository 接口定义
- dto.md: 数据传输对象，请求/响应 DTO 和 Entity 实体类
- config.md: 配置类、安全配置、异步配置等

### 前端模块 (Thymeleaf + JavaScript)
- ui.md: 前端 UI 架构，模板结构、JS 模块、页面路由映射

### 其他文档
- risk.md: 潜在风险点、修改注意事项、耦合区域说明
- cache-token-tracking.md: 缓存命中 Token 统计口径、字段含义与扣费规则

## 任务执行流程

1. 先阅读本文件 (index.md)，确定涉及模块
2. 查阅对应模块文档 (如 controller.md / service.md / ui.md)
3. 如需重大变更，同步更新 ai-context/ 对应说明
4. 执行 git 提交（若环境不支持：输出完整 commit 命令）

## 项目概览

- 类型：Spring Boot 3.x + Thymeleaf 全栈应用
- 核心功能：LLM API 网关，代理转发到 Ollama/vLLM 后端
- 认证方式：Session/Cookie (Web) + API Key (客户端)
- 数据库：MySQL 8.0+ (Spring Data JPA)
- 前端技术：Thymeleaf + 原生 JavaScript + ECharts

## 快速定位

| 需求类型 | 优先查看文件 |
|----------|--------------|
| 新增 API 端点 | controller.md → 对应 Controller |
| 修改业务逻辑 | service.md → 对应 Service |
| 调整数据模型 | dto.md + repository.md |
| 安全/认证配置 | config.md → SecurityConfig |
| 新增页面/组件 | ui.md → Thymeleaf 模板 + JS |
| 排查问题 | risk.md → 风险点说明 |
