# API 通信模块说明

---

## 文件清单

| 文件 | 职责 |
|------|------|
| `js/api.js` | API 封装 (`API` 对象) |

---

## API 对象 (`js/api.js`)

**职责**: 封装 vLLM 和 Ollama API 请求，处理流式响应

### 方法列表

```javascript
API = {
    getApiType(),           // 获取当前 API 类型
    getApiUrl(),            // 获取当前 API URL
    checkConnection(),      // 检查连接
    getModels(),            // 获取模型列表
    chat(prompt, model, temperature, controller),  // 发送流式请求
    parseStream(stream, onToken, onComplete)       // 解析流式响应
}
```

---

## API 类型支持

### vLLM (OpenAI 兼容)

**端点**:

| 方法 | 端点 | 用途 |
|------|------|------|
| GET | `/v1/models` | 获取模型列表 |
| POST | `/v1/chat/completions` | 聊天接口 (流式) |

**响应格式**:

```json
// GET /v1/models
{
    "data": [
        { "id": "model-name", ... }
    ]
}

// POST /v1/chat/completions (SSE)
data: {"id":"...","choices":[{"delta":{"content":"..."}],"usage":{"prompt_tokens":10,"completion_tokens":5}}}
data: [DONE]
```

### Ollama

**端点**:

| 方法 | 端点 | 用途 |
|------|------|------|
| GET | `/api/tags` | 获取模型列表 |
| POST | `/api/chat` | 聊天接口 (流式) |

**响应格式**:

```json
// GET /api/tags
{
    "models": [
        { "name": "model-name", ... }
    ]
}

// POST /api/chat (JSON lines)
{"message":{"content":"..."},"eval_count":5,"done":true}
```

---

## 核心方法详解

### getApiType()

**逻辑**:
```javascript
localStorage.getItem(Config.storageKeys.apiType) || Config.defaultApiType
```

**返回值**: `'vllm'` 或 `'ollama'`

### getApiUrl()

**逻辑**:
```javascript
savedUrl = localStorage.getItem(Config.storageKeys.apiUrl)
if (savedUrl) return savedUrl

// 根据 API 类型返回默认地址
apiType === 'vllm' ? Config.defaultVllmUrl : Config.defaultApiUrl
```

### checkConnection()

**用途**: 检查与服务器的连接

**请求**:
- vLLM: `GET /v1/models`
- Ollama: `GET /api/tags`

**超时**: 5 秒

**返回**:
```javascript
{ success: true, data: ... }  // 连接成功
{ success: false, error: '...' }  // 连接失败
```

### getModels()

**用途**: 获取模型列表

**逻辑**:
```javascript
if (apiType === 'vllm') {
    // vLLM 格式：{ data: [{ id: 'xxx' }] }
    return data.data?.map(m => m.id).filter(Boolean)
} else {
    // Ollama 格式：{ models: [{ name: 'xxx' }] }
    return data.models?.map(m => m.name).filter(Boolean)
}
```

### chat(prompt, model, temperature, controller)

**参数**:
- `prompt`: 用户输入的提示词
- `model`: 选中的模型
- `temperature`: 温度参数 (默认 0.7)
- `controller`: AbortController (用于停止请求)

**返回**: `ReadableStream` (响应体流)

**请求体**:

vLLM:
```json
{
    "model": "xxx",
    "messages": [{"role": "user", "content": "..."}],
    "stream": true,
    "temperature": 0.7
}
```

Ollama:
```json
{
    "model": "xxx",
    "messages": [{"role": "user", "content": "..."}],
    "stream": true,
    "options": {"temperature": 0.7}
}
```

**重试机制**:
- Ollama 特有：检测到 `loading model` 错误时，重试 5 次，间隔 1 秒

### parseStream(stream, onToken, onComplete)

**参数**:
- `stream`: ReadableStream (来自 chat())
- `onToken(content, tokens, type)`: 每收到一个 token 的回调
- `onComplete(stats)`: 请求完成的回调

**返回对象** (onComplete 参数):
```javascript
{
    content: string,           // 完整内容
    outputTokens: number,      // 输出 token 数
    totalTime: number,         // 总耗时 (ms)
    ttf: number | null,        // 首字延迟 (ms)
    speed: number             // 生成速度 (tokens/s)
}
```

**解析逻辑**:

vLLM (SSE 格式):
```javascript
// 分割 SSE 行
const lines = chunk.split('\n');

// 解析 data: {...}
if (line.startsWith('data: ')) {
    const data = JSON.parse(line.substring(6));
    
    // 获取内容
    if (data.choices?.[0]?.delta?.content) {
        // 更新 accumulatedContent
        // 记录 firstTokenTime
        // 调用 onToken()
    }
    
    // 获取 usage
    if (data.usage) {
        promptTokens = data.usage.prompt_tokens;
        outputTokens = data.usage.completion_tokens;
    }
}

// 结束标记
if (line.startsWith('data: [DONE]')) {
    // 计算统计
    // 调用 onComplete()
}
```

Ollama (JSON lines 格式):
```javascript
const lines = chunk.split('\n');

for (const line of lines) {
    const data = JSON.parse(line);
    
    // 获取内容
    if (data.message?.content) {
        // 更新 accumulatedContent
        // 记录 firstTokenTime
        // 调用 onToken()
    }
    
    // 结束标记
    if (data.done) {
        outputTokens = data.eval_count;
        // 计算统计
        // 调用 onComplete()
    }
}
```

---

## 性能指标计算

### TTFT (Time to First Token)

```javascript
ttf = firstTokenTime - startTime
```

### 生成速度

```javascript
generationTime = (lastTokenTime - firstTokenTime) / 1000  // 秒
visibleTokens = outputTokens > 0 ? outputTokens : accumulatedContent.length
speed = visibleTokens / generationTime  // tokens/s
```

### 总耗时

```javascript
totalTime = endTime - startTime  // ms
```

---

## 错误处理

| 错误类型 | 处理方式 |
|--------|--------|
| AbortError | 直接抛出 (用户主动停止) |
| loading model (Ollama) | 重试 5 次，间隔 1 秒 |
| HTTP 错误 | 抛出错误信息 |
| JSON 解析错误 | 忽略该行 |
| 网络错误 | 抛出错误信息 |

---

## 修改指引

| 修改场景 | 修改位置 |
|--------|--------|
| 新增 API 类型 | `api.js:checkConnection()/getModels()/chat()` 添加分支 |
| 修改请求参数 | `api.js:chat()` 请求体部分 |
| 修改解析逻辑 | `api.js:parseStream()` 对应 API 类型的解析代码 |
| 修改超时时间 | `api.js:checkConnection()` setTimeout |
| 修改重试次数 | `api.js:chat()` maxRetries |
| 修改默认地址 | `config.js:defaultVllmUrl/defaultApiUrl` |

---

## 注意事项

1. **流式响应必须完整读取**: 不能中断 stream 读取，否则可能导致内存泄漏
2. **AbortController 传递**: 每个请求需要独立的 controller 用于取消
3. **Ollama 模型加载**: 某些模型首次请求时会后台加载，需要重试
4. **Token 统计不准确**: vLLM 的 usage 只在最后一个 chunk 返回，需要用 content.length 兜底
