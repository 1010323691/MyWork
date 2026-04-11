# Risk Points - 潜在风险与注意事项

## 高风险区域

### 1. 余额预检与实际结算存在时间差
**文件**: `UserBillingService.java`, `UserBalanceService.java`
- 风险：预检基于输入 Token 估算，实际输出过高时，结算阶段仍可能出现余额不足
- 当前保护：结算时实际扣费，余额扣减有乐观锁重试
- 建议：如果后续账务要求更严格，可以考虑引入预占额度或更保守的估算策略

### 2. 并发扣费
**文件**: `UserBalanceService.java`
- 风险：同一用户并发请求时，多个请求可能先后通过余额预检
- 当前保护：`User` 使用 `@Version`，扣费逻辑带有限次重试
- 现状：`RequestQueueService` 已删除，当前方案完全依赖数据库乐观锁

### 3. 账务与日志异步写入并非同事务
**文件**: `RequestLogService.java`
- 风险：扣费成功但异步日志失败，或者日志成功而上游结算失败时，可能出现对账偏差
- 建议：后续如要做财务核对，应补一层补偿任务或对账任务

## 中风险区域

### 4. Token 估算偏差
**文件**: `LlmForwardService.java`, `OpenAiForwardService.java`
- 风险：当前不是严格 tokenizer 计数，不同模型下可能和真实 token 有偏差
- 建议：如果计费精度要求继续提高，可引入模型级 tokenizer 或安全系数

### 5. 上游价格缺失
**文件**: `BackendService.java`, `UpstreamProviderService.java`
- 风险：当上游卖价未配置时，费用可能为 0 或与预期不符
- 建议：后台对价格配置做必填校验，或在缺失价格时拒绝转发

### 6. 熔断恢复依赖真实流量
**文件**: `UpstreamProviderService.java`, `LlmController.java`, `OpenAiCompatibleController.java`
- 风险：熔断状态现在已接入主链路，但恢复成功依赖后续真实请求触发 `recordSuccess()`
- 建议：如果需要更稳定的恢复策略，可以考虑增加主动健康检查

### 7. API Key 明文存储
**文件**: `ApiKeyService.java`, `ApiKeyAuthenticationFilter.java`
- 风险：数据库泄漏后可直接用明文 Key 调接口
- 建议：后续可改为哈希存储，并补充速率限制与审计

## 变更检查清单
- 修改计费逻辑前，先确认是“用户余额”还是“API Key 用量统计”
- 修改日志字段前，确认 `DashboardService` 和日志页是否依赖该字段
- 修改供应商配置前，确认管理页和网关主链路是否都已同步
- 修改兼容接口流程前，确认流式和非流式路径都覆盖到了
