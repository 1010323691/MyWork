# 后端 Repository 模块

## Repository 文件

| 文件 | 职责 |
|--|--|
| `UserRepository.java` | 用户数据访问 |
| `ApiKeyRepository.java` | API Key 数据访问 |
| `BackendServiceRepository.java` | 后端服务数据访问 |
| `RequestLogRepository.java` | 请求日志数据访问 |
| `BalanceTransactionRepository.java` | 余额交易数据访问 |

---

## UserRepository 方法

| 方法 | 说明 |
|--|--|
| `findByUsername(username)` | 根据用户名查找 |
| `existsByUsername(username)` | 检查用户名存在 |
| `existsByEmail(email)` | 检查邮箱存在 |
| `existsByUserRole(role)` | 检查角色存在 |
| `countByCreatedAtGreaterThanEqual(since)` | 统计时间段用户数 |
| `searchUsers(userId, username, pageable)` | 搜索用户 |

---

## ApiKeyRepository 方法

| 方法 | 说明 |
|--|--|
| `findByApiKeyValue(apiKeyValue)` | 根据 API Key 值查找 |
| `findAllByOrderByCreatedAtDesc()` | 获取所有 Key（倒序） |
| `findByUserIdOrderByCreatedAtDesc(userId)` | 根据用户查找 |
| `findWithUserById(id)` | 带用户信息查找 |
| `existsByIdAndUser_Id(id, userId)` | 检查 Key 归属 |
| `existsByApiKeyValue(apiKeyValue)` | 检查 Key 存在 |
| `countByUserId(userId)` | 统计用户 Key 数 |
| `countByUserIdAndEnabled(userId, enabled)` | 统计启用 Key 数 |
| `countByEnabled(enabled)` | 统计全局启用 Key 数 |
| `sumUsedTokensByUserId(userId)` | 统计用户 Token 使用量 |
| `incrementUsedTokens(id, tokens, now)` | 增加 Token 使用量 |

---

## RequestLogRepository 方法

| 方法 | 说明 |
|--|--|
| `deleteByUserId(userId)` | 删除用户日志 |
| `getDailyTrendByUser(userId, since)` | 获取用户日趋势 |
| `sumTokensByUserSince(userId, since)` | 统计用户 Token 总数 |
| `sumCachedInputTokensByUserSince(userId, since)` | 统计缓存 Token |
| `countByUserId(userId)` | 统计用户请求数 |
| `countSuccessByUserId(userId)` | 统计成功请求数 |
| `avgLatencyByUserSince(userId, since)` | 平均延迟 |
| `getDailySummarySince(since)` | 全局日汇总 |
| `getModelSummarySince(since)` | 模型汇总 |
| `countDistinctModelsSince(since)` | 统计模型数量 |

---

## BalanceTransactionRepository 方法

| 方法 | 说明 |
|--|--|
| `findByUser_Id(userId, pageable)` | 分页获取用户交易记录 |

---

## BackendServiceRepository 方法

| 方法 | 说明 |
|--|--|
| `findByEnabled(enabled)` | 根据启用状态查找 |

---

## 实体模型

### User
| 字段 | 类型 | 说明 |
|--|--|--|
| id | Long | 主键 |
| username | String | 用户名 |
| password | String | 密码 |
| email | String | 邮箱 |
| enabled | Boolean | 启用状态 |
| userRole | String | 角色 (USER/ADMIN) |
| balance | BigDecimal | 余额 |
| version | Long | 乐观锁 |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |
| apiKeys | List<ApiKey> | 关联 API Keys |

### ApiKey
| 字段 | 类型 | 说明 |
|--|--|--|
| id | Long | 主键 |
| user | User | 所属用户 |
| apiKeyValue | String | API Key 值 |
| name | String | 名称 |
| usedTokens | Long | 已用 Token |
| enabled | Boolean | 启用状态 |
| expiresAt | LocalDateTime | 过期时间 |
| targetUrl | String | 目标 URL |
| routingConfig | String | 路由配置 |
| lastUsedAt | LocalDateTime | 最后使用时间 |

### BackendService
| 字段 | 类型 | 说明 |
|--|--|--|
| id | Long | 主键 |
| name | String | 服务名称 |
| baseUrl | String | 基础 URL |
| supportedModels | String | 支持模型 |
| serviceType | ServiceType | 服务类型 |
| enabled | Boolean | 启用状态 |
| timeoutSeconds | Integer | 超时时间 |
| upstreamKey | String | 上游 Key |
| buyPriceInput | BigDecimal | 买入价 (输入) |
| sellPriceInput | BigDecimal | 卖出价 (输入) |
| buyPriceOutput | BigDecimal | 买入价 (输出) |
| sellPriceOutput | BigDecimal | 卖出价 (输出) |
| failureCount | Integer | 失败计数 |
| lastFailureAt | LocalDateTime | 上次失败时间 |

### RequestLog
| 字段 | 类型 | 说明 |
|--|--|--|
| id | Long | 主键 |
| apiKey | ApiKey | 关联 Key |
| requestId | String | 请求 ID |
| userId | Long | 用户 ID(冗余) |
| inputTokens | Long | 输入 Token |
| outputTokens | Long | 输出 Token |
| totalInputTokens | Long | 总输入 Token |
| cachedInputTokens | Long | 缓存 Token |
| modelName | String | 模型名 |
| latencyMs | Long | 延迟 (ms) |
| costAmount | BigDecimal | 成本 |
| status | RequestStatus | 状态 |
| createdAt | LocalDateTime | 创建时间 |

### BalanceTransaction
| 字段 | 类型 | 说明 |
|--|--|--|
| id | Long | 主键 |
| user | User | 所属用户 |
| transactionType | TransactionType | 交易类型 |
| amount | BigDecimal | 金额 |
| balanceBefore | BigDecimal | 交易前余额 |
| balanceAfter | BigDecimal | 交易后余额 |
| title | String | 标题 |
| detail | String | 详情 |
| referenceId | String | 参考 ID |
| createdBy | String | 创建者 |
| createdAt | LocalDateTime | 创建时间 |
