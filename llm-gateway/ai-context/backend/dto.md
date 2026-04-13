# 后端 DTO 模块

## 请求 DTO (Request)

### ChatRequest
| 字段 | 类型 | 说明 |
|------|------|------|
| model | String | 模型名称 |
| messages | JsonNode | 消息列表 |
| stream | Boolean | 是否流式 (默认 false) |
| backendUrl | String | 后端 URL |

---

### AuthRequest
| 字段 | 类型 | 说明 |
|------|------|------|
| username | String | 用户名 |
| password | String | 密码 |

---

### RegisterRequest
| 字段 | 类型 | 说明 | 验证 |
|------|------|------|------|
| username | String | 用户名 | NotBlank, Size(3-50) |
| password | String | 密码 | NotBlank, Size(min=6) |
| email | String | 邮箱 | NotBlank, Email |

---

### ApiKeyRequest
| 字段 | 类型 | 说明 | 验证 |
|------|------|------|------|
| name | String | Key 名称 | NotBlank |

---

### AdminKeyUpdateRequest
| 字段 | 类型 | 说明 |
|------|------|------|
| targetUrl | String | 目标 URL |
| clearTargetUrl | Boolean | 清空目标 URL |
| routingConfig | String | 路由配置 |
| clearRoutingConfig | Boolean | 清空路由配置 |
| enabled | Boolean | 启用状态 |

---

## 响应 DTO (Response)

### ApiKeyResponse
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| userId | Long | 用户 ID |
| username | String | 用户名 |
| key | String | API Key 值 (@JsonProperty) |
| name | String | 名称 |
| usedTokens | Long | 已用 Token |
| enabled | Boolean | 启用状态 |
| expiresAt | LocalDateTime | 过期时间 |
| createdAt | LocalDateTime | 创建时间 |
| lastUsedAt | LocalDateTime | 最后使用时间 |
| targetUrl | String | 目标 URL |
| routingConfig | String | 路由配置 |

---

### TokenUsageResponse
| 字段 | 类型 | 说明 |
|------|------|------|
| usedTokens | Long | Token 使用量 |
| apiKeyName | String | API Key 名称 |

---

### AdminUserResponse
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| username | String | 用户名 |
| email | String | 邮箱 |
| enabled | Boolean | 启用状态 |
| userRole | String | 角色 |
| apiKeyCount | Long | API Key 数量 |
| totalUsedTokens | Long | 总 Token 使用量 |
| balance | BigDecimal | 余额 |
| createdAt | LocalDateTime | 创建时间 |

---

### BalanceTransactionResponse
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| type | String | 交易类型 |
| amount | BigDecimal | 金额 |
| balanceBefore | BigDecimal | 交易前余额 |
| balanceAfter | BigDecimal | 交易后余额 |
| title | String | 标题 |
| detail | String | 详情 |
| referenceId | String | 参考 ID |
| createdBy | String | 创建者 |
| createdAt | LocalDateTime | 创建时间 |

---

### RequestLogResponse
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| requestId | String | 请求 ID |
| userId | Long | 用户 ID |
| apiKeyId | Long | API Key ID |
| apiKeyName | String | API Key 名称 |
| inputTokens | Long | 输入 Token |
| outputTokens | Long | 输出 Token |
| totalInputTokens | Long | 总输入 Token |
| cachedInputTokens | Long | 缓存 Token |
| modelName | String | 模型名 |
| latencyMs | Long | 延迟 (ms) |
| costAmount | BigDecimal | 成本 |
| status | String | 状态 |
| createdAt | LocalDateTime | 创建时间 |

---

### UserStatsResponse
| 字段 | 类型 | 说明 |
|------|------|------|
| todayTokens | Long | 今日 Token |
| monthTokens | Long | 本月 Token |
| todayCachedTokens | Long | 今日缓存 Token |
| monthCachedTokens | Long | 本月缓存 Token |
| totalRequests | Long | 总请求数 |
| successRate | Double | 成功率 |
| activeKeys | Long | 活跃 Key 数 |
| totalKeys | Long | 总 Key 数 |
| dailyTrend | List<DailyTokenStat> | 日趋势 |

---

### DashboardSummaryResponse
仪表盘汇总响应，包含嵌套类：

| 字段 | 类型 | 说明 |
|------|------|------|
| role | String | 当前用户角色 |
| revenue | RevenueMetrics | 收益指标 |
| usage | UsageMetrics | 使用指标 |
| audience | AudienceMetrics | 用户指标 |
| quality | QualityMetrics | 质量指标 |
| resources | ResourceMetrics | 资源指标 |
| dailyTrend | List<TrendPoint> | 日趋势 |
| modelMetrics | List<ModelMetric> | 模型指标 |
| requestStatusDistribution | List<NameValueMetric> | 请求状态分布 |
| apiKeyStatusDistribution | List<NameValueMetric> | Key 状态分布 |

#### RevenueMetrics
| 字段 | 类型 | 说明 |
|------|------|------|
| todayRevenue | BigDecimal | 今日收益 |
| monthRevenue | BigDecimal | 本月收益 |
| totalRevenue | BigDecimal | 总收益 |
| avgCostPerRequest | BigDecimal | 平均请求成本 |

#### UsageMetrics
| 字段 | 类型 | 说明 |
|------|------|------|
| todayTokens | Long | 今日 Token |
| monthTokens | Long | 本月 Token |
| todayCachedTokens | Long | 今日缓存 Token |
| monthCachedTokens | Long | 本月缓存 Token |
| todayCacheHitRate | Double | 今日缓存命中率 |
| monthCacheHitRate | Double | 本月缓存命中率 |
| todayRequests | Long | 今日请求数 |
| totalRequests | Long | 总请求数 |
| avgTokensPerRequest | Double | 平均请求 Token |
| activeModels30d | Long | 30 天活跃模型数 |

#### AudienceMetrics
| 字段 | 类型 | 说明 |
|------|------|------|
| totalUsers | Long | 总用户数 |
| newUsersToday | Long | 今日新用户 |
| totalApiKeys | Long | 总 API Key 数 |
| activeApiKeys | Long | 活跃 Key 数 |

#### QualityMetrics
| 字段 | 类型 | 说明 |
|------|------|------|
| successRate | Double | 成功率 |
| errorRate | Double | 错误率 |
| avgLatencyMs | Double | 平均延迟 |
| p95LatencyMs | Long | P95 延迟 |

#### ResourceMetrics
| 字段 | 类型 | 说明 |
|------|------|------|
| cpuUsage | Double | CPU 使用率 |
| memoryUsage | Double | 内存使用率 |
| gpuCount | Integer | GPU 数量 |
| avgGpuUsage | Double | 平均 GPU 使用率 |

#### TrendPoint
| 字段 | 类型 | 说明 |
|------|------|------|
| date | String | 日期 |
| requests | Long | 请求数 |
| tokens | Long | Token 数 |
| revenue | BigDecimal | 收益 |

#### ModelMetric
| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 模型名 |
| requests | Long | 请求数 |
| tokens | Long | Token 数 |
| avgLatencyMs | Double | 平均延迟 |

#### NameValueMetric
| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 名称 |
| value | Long | 值 |

---

### SystemMonitorResponse
| 字段 | 类型 | 说明 |
|------|------|------|
| cpuUsage | Double | CPU 使用率 |
| memoryUsage | Double | 内存使用率 |
| gpus | List<GpuInfo> | GPU 信息列表 |

#### GpuInfo
| 字段 | 类型 | 说明 |
|------|------|------|
| index | int | GPU 索引 |
| name | String | GPU 名称 |
| utilization | Double | 利用率 |
| memoryUsedMb | Long | 已用显存 (MB) |
| memoryTotalMb | Long | 总显存 (MB) |
| memoryUsagePercent | Double | 显存使用率 |

---

### ModelCatalogResponse
| 字段 | 类型 | 说明 |
|------|------|------|
| gatewayBaseUrl | String | 网关基础 URL |
| chatCompletionsPath | String | 聊天完成路径 |
| models | List<ModelItem> | 模型列表 |

#### ModelItem
| 字段 | 类型 | 说明 |
|------|------|------|
| providerId | Long | 提供商 ID |
| modelName | String | 模型名 |
| status | String | 状态 |
| statusLabel | String | 状态标签 |
| sourceLabel | String | 来源标签 |

---

## ProviderDTO
上游提供商 DTO，用于 API 响应（不暴露 upstreamKey）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| name | String | 名称 |
| baseUrl | String | 基础 URL |
| supportedModels | String | 支持模型 |
| serviceType | ServiceType | 服务类型 |
| enabled | Boolean | 启用状态 |
| timeoutSeconds | Integer | 超时时间 |
| buyPriceInput | BigDecimal | 买入价 (输入) |
| sellPriceInput | BigDecimal | 卖出价 (输入) |
| buyPriceOutput | BigDecimal | 买入价 (输出) |
| sellPriceOutput | BigDecimal | 卖出价 (输出) |
| failureCount | Integer | 失败计数 |
| lastFailureAt | LocalDateTime | 上次失败时间 |
| createdAt | LocalDateTime | 创建时间 |
| updatedAt | LocalDateTime | 更新时间 |

---

## 特殊说明

1. **ProviderDTO** 使用手动 getter/setter，不支持 Lombok，提供 `ProviderDTO(BackendService)` 构造函数进行实体转换
2. **DashboardSummaryResponse** 包含多个嵌套静态类，使用 Lombok @Data @Builder 注解
3. **SystemMonitorResponse.GpuInfo** 包含 `getMemoryUsagePercent()` 方法，在字段为 null 时自动计算
4. **ApiKeyResponse** 的 apiKeyValue 字段使用 `@JsonProperty("key")` 映射为 JSON 的 key 字段
