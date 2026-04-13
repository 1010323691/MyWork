# 后端 Service 模块

## 核心服务

### LLM 转发
| 文件 | 职责 |
|--|--|
| `LlmForwardService.java` | LLM 请求转发核心 |
| `OpenAiForwardService.java` | OpenAI 格式转发 |
| `AnthropicForwardService.java` | Anthropic 格式转发 |

### 上游提供商
| 文件 | 职责 |
|--|--|
| `UpstreamProviderService.java` | 上游提供商管理（CRUD、熔断器、模型发现） |
| `RoutingConfigParser.java` | 路由配置解析 |

### 计费与余额
| 文件 | 职责 |
|--|--|
| `UserBillingService.java` | 用户计费（余额检查、扣费结算） |
| `UserBalanceService.java` | 用户余额操作 |
| `BalanceTransactionService.java` | 余额交易记录 |

### 日志
| 文件 | 职责 |
|--|--|
| `RequestLogService.java` | 请求日志记录 |
| `LogQueryService.java` | 日志查询 |

### 安全
| 文件 | 职责 |
|--|--|
| `SecurityThrottleService.java` | 安全限流（登录、注册、写入、完成） |

### 其他
| 文件 | 职责 |
|--|--|
| `ApiKeyService.java` | API Key 服务 |
| `DashboardService.java` | 仪表盘数据统计 |
| `SystemService.java` | 系统监控 |
| `ModelCatalogService.java` | 模型目录服务 |

---

## 核心服务详细

### LlmForwardService
| 方法 | 说明 |
|--|--|
| `forwardChatRequest(backendUrl, model, messages)` | 转发聊天请求到上游 |
| `estimateTokenUsage(content)` | 估算 Token 使用量 |

### UserBillingService
| 方法 | 说明 |
|--|--|
| `hasEnoughBalance(userId, provider, estimatedInputTokens)` | 检查余额是否充足 |
| `settleUsage(userId, provider, inputTokens, outputTokens, requestId, modelName)` | 结算使用量并扣费 |
| `estimateCost(provider, inputTokens, outputTokens)` | 估算请求成本 |

### UpstreamProviderService
| 方法 | 说明 |
|--|--|
| `findById(id)` | 根据 ID 查找提供商 |
| `findByModelName(modelName)` | 根据模型名查找提供商 |
| `findAllEnabled()` | 获取所有启用的提供商 |
| `create(provider)` | 创建提供商 |
| `update(id, updateData)` | 更新提供商 |
| `delete(id)` | 删除提供商 |
| `recordFailure(providerId)` | 记录失败（熔断器） |
| `recordSuccess(providerId)` | 记录成功 |
| `isCircuitOpen(providerId)` | 检查熔断器是否打开 |
| `resetFailureCount(providerId)` | 重置失败计数 |
| `testConnectivity(provider)` | 测试连接性 |
| `discoverModels(provider)` | 发现支持的模型 |
| `matchesModel(service, modelName)` | 模型匹配（支持通配符） |

---

## 核心调用链

### LLM 请求转发
```
LlmController.chat()
  → RoutingConfigParser.resolveTargetUrl()  // 解析目标 URL
  → RoutingConfigParser.resolveModel()      // 解析模型名
  → UpstreamProviderService.findByModelName() // 查找提供商
  → UserBillingService.hasEnoughBalance()   // 检查余额
  → LlmForwardService.forwardChatRequest()  // 转发请求
  → UserBillingService.settleUsage()        // 结算扣费
  → RequestLogService.asyncLogRequest()     // 记录日志
```

### OpenAI 兼容请求
```
OpenAiCompatibleController.chatCompletions()
  → ApiKeyAuthenticationFilter  // API Key 认证
  → RoutingConfigParser.resolveTargetUrl()
  → OpenAiForwardService.forwardChatCompletion()
  → UserBillingService.settleUsage()
  → RequestLogService.asyncLogRequest()
```

### 提供商管理
```
AdminProviderController.create()
  → UpstreamProviderService.create()

AdminProviderController.testConnectivity()
  → UpstreamProviderService.testConnectivity()

AdminProviderController.discoverModels()
  → UpstreamProviderService.discoverModels()
```
