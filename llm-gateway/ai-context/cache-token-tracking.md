# Cache Token Tracking

## 2026-04 Update

- `RequestLog.inputTokens`: actual billed/computed input tokens after subtracting cache hits
- `RequestLog.totalInputTokens`: original total prompt/input tokens
- `RequestLog.cachedInputTokens`: prompt/input tokens served from cache
- `OpenAiForwardService`: prefers upstream `usage` fields and reads cache-hit tokens from `prompt_tokens_details.cached_tokens` or `input_tokens_details.cached_tokens`
- Billing and `ApiKey.usedTokens` now use `actualInputTokens + outputTokens`
- Logs, dashboard summary, and user balance stats expose cache-hit metrics
