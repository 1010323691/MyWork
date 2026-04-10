# LLM Gateway 项目索引

## 工程路径
```
D:\projectPath\MyWork\llm-gateway
```

## 技术栈概览
- **后端**: Spring Boot 3.4.1 + Java 17
- **前端**: Thymeleaf + JavaScript (ECharts)
- **数据库**: MySQL + JPA/Hibernate
- **安全**: Spring Security (Session/Cookie 模式)

---

## 模块文档索引

### 后端模块
| 文件 | 职责 |
|------|------|
| [controller.md](./controller.md) | REST API 控制器与页面路由 |
| [service.md](./service.md) | 业务逻辑处理（转发、计费、限流） |
| [repository.md](./repository.md) | JPA 数据访问接口定义 |
| [entity.md](./entity.md) | 数据库实体映射结构 |
| [security.md](./security.md) | Spring Security 认证授权配置 |

### 前端模块
| 文件 | 职责 |
|------|------|
| [ui.md](./ui.md) | Thymeleaf 模板、JavaScript 交互与样式 |

---

## 任务执行流程（严格按顺序）

1. **阅读 index.md** → 确定涉及模块
2. **查阅对应模块文档** → 理解结构与定位文件
3. **修改代码文件** → 仅操作必要文件，避免无关改动
4. **同步更新文档** → 若结构/方法体/核心实现有重大变更

5. **执行 git 提交** → 使用以下命令格式：

```bash
git add <涉及的文件列表>
git commit -m "类型：简短说明"
# 例如：git commit -m "feat: 添加新的 API Key 校验规则"
```

---

## 快速定位指南

| 问题场景 | 优先查阅文档 |
|----------|--------------|
| REST API 路由配置 | controller.md |
| LLM 转发逻辑 | service.md |
| 数据库查询/实体设计 | entity.md、repository.md |
| 认证/授权机制 | security.md |
| 页面显示/UI 交互 | ui.md |

---

## 核心业务流

```
用户请求 → Controller 路由分发 → Service 处理逻辑 → Repository 数据持久化 → Entity ORM 映射
                    ↓
            Security 拦截验证 (API Key / Session)
                    ↓
           UI 渲染 (Thymeleaf + JavaScript)
```
