# API 通信模块分析

## 文件构成

| 文件 | 职责 |
|------|------|
| `js/api.js` | Ollama 和 vLLM API 封装 |
| `js/config.js` | API 默认配置 |

## API 对象核心函数

| 函数 | 作用 | 参数 | 返回值 |
|------|------|------|--------|
| `API.getApiType()` | 获取当前 API 类型 | - | `'vllm' \| 'ollama'` |
| `API.getApiUrl()` | 获取当前 API URL | - | `string` |
| `API.checkConnection()` | 检查连接 | - | `{ success, data/error }` |
| `API.getModels()` | 获取模型列表 | - | `string[]` |
| `API.chat(prompt, model, temp, controller)` | 发起聊天请求 | prompt, model, temperature, AbortController | `ReadableStream` |
| `API.parseStream(stream, onToken, onComplete)` | 解析流式响应 | stream, onToken 回调，onComplete 回调 | `{ reader }` |

## API 类型差异

### vLLM (OpenAI 兼容)

| 项目 | 值 |
|------|-----|
| 模型列表接口 | `/v1/models` |
| 聊天接口 | `/v1/chat/completions` |
| 请求体格式 | OpenAI 标准格式 |
| 响应格式 | SSE (`data: {...}`) |
| Token 统计 | `usage.prompt_tokens`, `usage.completion_tokens` |

### Ollama

| 项目 | 值 |
|------|-----|
| 模型列表接口 | `/api/tags` |
| 聊天接口 | `/api/chat` |
| 请求体格式 | Ollama 自有格式 |
| 响应格式 | 每行一个 JSON |
| Token 统计 | `eval_count` (输出), `prompt_eval_count` (输入) |

## API 请求详情

### checkConnection()

```javascript
// vLLM
GET /v1/models
Accept: application/json

// Ollama
GET /api/tags
Accept: application/json

// 超时：5 秒
```

### getModels()

```javascript
// vLLM 响应格式
{
  "data": [
    { "id": "model-name", ... }
  ]
}
→ 返回 data[].id 数组

// Ollama 响应格式
{
  "models": [
    { "name": "model-name", ... }
  ]
}
→ 返回 models[].name 数组
```

### chat()

```javascript
// vLLM 请求体
POST /v1/chat/completions
Content-Type: application/json
Accept: text/event-stream

{
  "model": "model-name",
  "messages": [{ "role": "user", "content": "prompt" }],
  "stream": true,
  "temperature": 0.7
}

// Ollama 请求体
POST /api/chat
Content-Type: application/json

{
  "model": "model-name",
  "messages": [{ "role": "user", "content": "prompt" }],
  "stream": true,
  "options": { "temperature": 0.7 }
}
```

### parseStream()

#### vLLM 流解析

```
data: {"id":"xxx","choices":[{"delta":{"content":"hello"}}]}

data: {"usage":{"prompt_tokens":10,"completion_tokens":50}}

data: [DONE]
```

#### Ollama 流解析

```json
{"message":{"content":"hello"},"eval_count":1}
```

```json
{"done":true,"eval_count":50,"total_duration":100000000}
```

## 错误处理

### 重试机制 (仅 Ollama)

| 错误类型 | 重试次数 | 重试间隔 |
|----------|----------|----------|
| `loading model` | 5 次 | 1 秒 |

### 错误类型

| 错误 | 说明 | 处理 |
|------|------|------|
| `AbortError` | 用户停止测试 | 标记任务为 `aborted` |
| `HTTP 500 loading model` | 模型加载中 | 重试 |
| 其他 HTTP 错误 | 服务器错误 | 标记任务为 `error` |

## Token 统计获取

| API 类型 | 输入 Token | 输出 Token |
|----------|-----------|------------|
| vLLM | `usage.prompt_tokens` | `usage.completion_tokens` |
| Ollama | `prompt_eval_count` | `eval_count` |
| 降级方案 | - | `accumulatedContent.length` |

## 性能计算

```javascript
// 在 parseStream() 完成时计算

startTime = Date.now()                    // 请求开始
firstTokenTime = Date.now()               // 第一个 token 到达
lastTokenTime = Date.now()                // 最后一个 token 到达

totalTime = endTime - startTime           // 总耗时 (ms)
ttf = firstTokenTime - startTime          // TTFT (ms)
generationTime = (lastTokenTime - firstTokenTime) / 1000  // 生成时间 (s)

outputTokens = 从 API 获取或 fallback 到 content.length
speed = outputTokens / generationTime     // tokens/秒
```

## API 修改定位

| 修改需求 | 修改位置 |
|----------|----------|
| 添加新 API 类型 | `Config.apiTypes`, `API.checkConnection()`, `API.getModels()`, `API.chat()`, `API.parseStream()` |
| 修改请求参数 | `API.chat()` 中的 `JSON.stringify()` |
| 修改响应解析 | `API.parseStream()` 中的解析逻辑 |
| 修改超时时间 | `API.checkConnection()` 中的 `setTimeout` |
| 修改重试策略 | `API.chat()` 中的重试循环 |
