# 后端 Controller 模块

## 核心入口

| 文件 | 说明 |
|--|--|
| `LlmGatewayApplication.java` | Spring Boot 主入口 |

---

## Controller 分类

### 页面路由
| 文件 | 职责 |
|--|--|
| `ViewController.java` | 前端页面渲染（Thymeleaf） |
| `AppErrorController.java` | 全局错误处理 |

### 认证模块
| 文件 | 职责 |
|--|--|
| `AuthController.java` | 登录、注册、获取当前用户 |

### 用户功能
| 文件 | 职责 |
|--|--|
| `UserController.java` | 用户日志查询、统计 |
| `DashboardController.java` | 仪表盘数据 |
| `UserBalanceController.java` | 余额管理 |

### API Key 管理
| 文件 | 职责 |
|--|--|
| `ApiKeyController.java` | API Key CRUD |
| `ClientController.java` | Token 使用量查询 |

### 管理员功能
| 文件 | 职责 |
|--|--|
| `AdminController.java` | 用户管理、系统监控 |
| `AdminLogController.java` | 日志查询 |
| `AdminProviderController.java` | 上游提供商管理 |

### LLM 转发核心
| 文件 | 职责 |
|--|--|
| `LlmController.java` | 非流式聊天、模型列表 |
| `OpenAiCompatibleController.java` | OpenAI 兼容接口（支持流式） |
| `AnthropicCompatibleController.java` | Anthropic 兼容接口（支持流式） |

### 模型管理
| 文件 | 职责 |
|--|--|
| `ModelCatalogController.java` | 模型目录查询 |

---

## API 端点清单

### 页面路由 (ViewController)
| 端点 | 方法 | 说明 | 权限 |
|--|--|--|--|
| `/login` | GET | 登录页面 | 公开 |
| `/register` | GET | 注册页面 | 公开 |
| `/dashboard` | GET | 仪表盘 | 认证 |
| `/apikeys` | GET | API Key 管理 | 认证 |
| `/models` | GET | 模型目录 | 认证 |
| `/logs` | GET | 请求日志 | 认证 |
| `/admin/users` | GET | 用户管理 | ADMIN |
| `/admin/keys` | GET | Key 管理 | ADMIN |
| `/admin/monitor` | GET | 系统监控 | ADMIN |
| `/admin/providers` | GET | 提供商管理 | ADMIN |
| `/user/balance` | GET | 余额页面 | 认证 |

### 认证 (AuthController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/me` | GET | 获取当前用户 |

### 仪表盘 (DashboardController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/dashboard/summary` | GET | 仪表盘汇总数据 |

### 用户日志 (UserController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/user/logs` | GET | 用户请求日志列表 |
| `/api/user/logs/{id}` | GET | 日志详情 |
| `/api/user/stats` | GET | 用户统计数据 |

### 余额管理 (UserBalanceController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/balance/current` | GET | 当前用户余额 |
| `/api/balance/user/{userId}` | GET | 指定用户余额 |
| `/api/balance/admin/user/{userId}` | PUT | 调整余额 |
| `/api/balance/estimate` | POST | 估算成本 |
| `/api/balance/transactions` | GET | 交易记录 |

### API Key (ApiKeyController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/apikeys` | GET | 列表 |
| `/api/apikeys` | POST | 创建 |
| `/api/apikeys/{id}` | DELETE | 删除 |
| `/api/apikeys/{id}/toggle` | PUT | 启用/禁用 |

### 管理员 (AdminController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/admin/users` | GET | 用户列表 |
| `/api/admin/users/{id}/toggle` | PUT | 启用/禁用用户 |
| `/api/admin/users/{id}` | DELETE | 删除用户 |
| `/api/admin/keys/{id}` | PUT | 更新 Key 配置 |
| `/api/admin/monitor` | GET | 系统监控 |

### 管理员日志 (AdminLogController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/admin/logs` | GET | 日志列表 |
| `/api/admin/logs/{id}` | GET | 日志详情 |

### 提供商管理 (AdminProviderController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/admin/providers` | GET | 提供商列表 |
| `/api/admin/providers/{id}` | GET | 提供商详情 |
| `/api/admin/providers` | POST | 创建提供商 |
| `/api/admin/providers/{id}` | PUT | 更新提供商 |
| `/api/admin/providers/{id}` | DELETE | 删除提供商 |
| `/api/admin/providers/test-connectivity` | POST | 测试连接 |
| `/api/admin/providers/discover-models` | POST | 发现模型 |
| `/api/admin/providers/{id}/reset-circuit` | POST | 重置熔断器 |

### LLM 转发 (LlmController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/llm/chat` | POST | 聊天（非流式） |
| `/api/chat` | POST | 聊天（非流式） |
| `/api/llm/models` | GET | 模型列表 |
| `/api/models` | GET | 模型列表 |

### OpenAI 兼容 (OpenAiCompatibleController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/v1/chat/completions` | POST | 聊天完成（支持流式） |
| `/v1/models` | GET | 模型列表 |

### Anthropic 兼容 (AnthropicCompatibleController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/v1/messages` | POST | 消息接口（支持流式） |

### 模型目录 (ModelCatalogController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/models/catalog` | GET | 模型目录 |

### Token 查询 (ClientController)
| 端点 | 方法 | 说明 |
|--|--|--|
| `/api/clients/token-usage` | GET | Token 使用量 |
