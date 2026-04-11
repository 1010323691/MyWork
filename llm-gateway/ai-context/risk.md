# Risk Points - 潜在风险与注意事项

## 高风险区域

### 1. 用户余额预检与结算
**文件**: `UserBillingService.java`, `UserBalanceService.java`
- 风险: 预检基于估算输入 Token，实际输出过高时可能导致结算阶段余额不足
- 建议: 后续可引入预冻结余额或更保守的预估策略

### 2. 并发扣费
**文件**: `UserBalanceService.java`, `RequestQueueService.java`
- 风险: 同一用户并发请求可能同时通过预检
- 当前保护: `User` 上有 `@Version`，扣款有重试
- 建议: 如并发较高，可把主扣费流程接入 `RequestQueueService`

### 3. 日志与账单一致性
**文件**: `RequestLogService.java`
- 风险: 账单已扣但异步日志失败，或日志成功但结算失败
- 建议: 后续增加对账任务与失败补偿

## 中风险区域

### 4. Token 估算偏差
**文件**: `LlmForwardService.java`, `OpenAiForwardService.java`
- 风险: 预估 Token 与模型真实 tokenizer 偏差较大
- 建议: 接入更精确 tokenizer，或增加安全系数

### 5. 上游供应商价格缺失
**文件**: `BackendService.java`, `UpstreamProviderService.java`
- 风险: 未匹配到供应商或卖价未配置时，当前费用可能为 0
- 建议: 后台对价格配置做必填校验，或在未配置价格时拒绝转发

### 6. API Key 明文存储
**文件**: `ApiKeyService.java`, `ApiKeyAuthenticationFilter.java`
- 风险: Key 泄露后可直接调用接口
- 建议: 后续改为哈希存储并补充速率限制

## 变更检查清单
- 修改计费逻辑前，确认是“用户余额”还是“API Key 用量统计”
- 修改日志字段前，确认 Dashboard 查询是否依赖 `costAmount`
- 修改上游价格字段前，确认前端供应商管理页是否同步
