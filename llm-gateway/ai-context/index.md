# LLM Gateway - AI Context 导航

## 文档阅读顺序

1. **快速了解项目**: 阅读本文档
2. **前端修改**: 查看 `frontend/ui.md` + `frontend/api.md`
3. **后端修改**: 查看 `backend/` 系列文档
4. **API 调试**: 查看 `api-mapping.md`
5. **风险评估**: 查看 `risk.md`

---

## 模块划分

### 前端模块
| 文件 | 说明 |
|------|------|
| `frontend/ui.md` | UI 组件、页面结构、CSS 样式 |
| `frontend/api.md` | 前端 API 调用、事件处理 |

### 后端模块
| 文件 | 说明 | 阅读顺序 |
|------|------|--|
| `backend/controller.md` | 控制器层、API 端点清单 | 1 |
| `backend/service.md` | 业务逻辑层、核心调用链 | 2 |
| `backend/repository.md` | 数据访问层、实体模型 | 3 |
| `backend/dto.md` | 数据传输对象、请求响应 | 4 |
| `backend/config.md` | 配置类、安全过滤器 | 5 |

### 其他
| 文件 | 说明 |
|------|------|
| `api-mapping.md` | 前后端接口映射表 |
| `risk.md` | 风险点、强耦合模块 |

---

## 核心入口

| 类型 | 文件路径 |
|------|----------|
| 后端 Main | `src/main/java/com/nexusai/llm/gateway/LlmGatewayApplication.java` |
| 前端布局 | `src/main/resources/templates/layout/base.html` |
| 安全配置 | `src/main/java/com/nexusai/llm/gateway/security/SecurityConfig.java` |

---

## 快速定位

### 前端问题
| 问题类型 | 查看文档 |
|--|--|
| UI 样式异常 | `frontend/ui.md` |
| 表单验证失败 | `frontend/ui.md` + 页面 HTML |
| API 调用无响应 | `frontend/api.md` |
| 数据加载失败 | `frontend/api.md` + `api-mapping.md` |

### 后端问题
| 问题类型 | 查看文档 |
|--|--|
| API 端点定位 | `backend/controller.md` |
| 业务逻辑理解 | `backend/service.md` |
| 数据库操作 | `backend/repository.md` |
| DTO 字段问题 | `backend/dto.md` |
| 认证授权 | `backend/config.md` |
| 限流熔断 | `backend/config.md` + `risk.md` |

### 综合问题
| 问题类型 | 查看文档 |
|--|--|
| 前后端联调 | `api-mapping.md` |
| 代码修改风险评估 | `risk.md` |
| 核心调用链 | `backend/service.md` |
