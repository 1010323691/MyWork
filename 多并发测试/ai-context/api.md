# API 通信模块分析 (api.js)

> 封装 vLLM 和 Ollama 两种 API，提供统一的接口调用

---

## 一、模块职责

```
api.js (API 对象)
├── 配置获取
│   ├── getApiType()     L10  获取 API 类型
│   └── getApiUrl()      L17  获取 API 地址
├── 连接管理
│   └── checkConnection() L31 检查连接状态
├── 模型管理
│   └── getModels()      L67 获取模型列表
├── 聊天请求
│   ├── chat()           L104 发送流式请求
│   └── parseStream()    L189 解析流式响应
└── 错误处理
    └── 重试机制         L107-181 Ollama 模型加载重试
```

---

## 二、API 类型支持

### 2.1 支持的 API

| API 类型 | 常量值 | 端点格式 | 备注 |
|------|----|----|----|
| vLLM | `'vllm'` | `/v1/chat/completions` | OpenAI 兼容格式 |
| Ollama | `'ollama'` | `/api/chat` | Ollama 专用格式 |

### 2.2 API 类型切换逻辑

```javascript
// api.js:10-12
getApiType()
返回:
  localStorage.getItem(Config.storageKeys.apiType) || Config.defaultApiType

默认值:
  Config.defaultApiType = 'vllm' (config.js:16)
```

```javascript
// api.js:17-26
getApiUrl()
返回:
  1. 优先：localStorage 保存的地址 (去除尾部 /)
  2. 否则：根据 apiType 返回默认地址
     - apiType === 'vllm' → Config.defaultVllmUrl
     - 其他 → Config.defaultApiUrl

默认地址:
  Config.defaultApiUrl  = 'http://192.168.0.119:11434' (Ollama)
  Config.defaultVllmUrl = 'http://127.0.0.1:8000' (vLLM)
```

---

## 三、连接检查

### 3.1 checkConnection() - 连接验证

```javascript
// api.js:31-62
async checkConnection()

请求逻辑:
  1. 创建 AbortController (5 秒超时)
  
  2. 根据 apiType 选择端点:
     - vLLM:  GET /v1/models
     - Ollama: GET /api/tags
  
  3. 发送请求:
     fetch(url, {
       method: 'GET',
       headers: { 'Accept': 'application/json' },
       signal: controller.signal
     })
  
  4. 响应处理:
     - res.ok → { success: true, data }
     - 其他 → { success: false, error }

返回格式:
{
  success: boolean,
  data?: object | error?: string
}

调用位置:
  - main.js:32 App.checkConnection()
```

---

## 四、模型列表获取

### 4.1 getModels() - 获取模型

```javascript
// api.js:67-99
async getModels()

请求逻辑:
  1. 根据 apiType 选择端点:
     - vLLM:  GET /v1/models
     - Ollama: GET /api/tags
  
  2. 解析响应:
     - vLLM:  data.data[].id (OpenAI 格式)
     - Ollama: data.models[].name
  
  3. 过滤空值返回数组

响应格式差异:

vLLM (OpenAI 兼容):
{
  "data": [
    { "id": "qwen2.5", "object": "model" },
    { "id": "llama3", "object": "model" }
  ]
}

Ollama:
{
  "models": [
    { "name": "qwen2.5:latest", ... },
    { "name": "llama3:latest", ... }
  ]
}

返回:
  - 成功：['model1', 'model2', ...]
  - 失败：[]

调用位置:
  - main.js:51 App.loadModels()
```

---

## 五、聊天请求 (核心)

### 5.1 chat() - 发送流式请求

```javascript
// api.js:104-184
async chat(prompt, model, temperature, controller)

参数:
  - prompt: string 用户提示词
  - model: string 模型名称
  - temperature: number 温度参数 (默认 0.7)
  - controller: AbortController | null 取消控制器

重试机制 (Ollama 专用):
  maxRetries = 5
  retryDelay = 1000ms
  
  for attempt = 1 to maxRetries:
    try {
      // 发送请求
      if (Ollama 500 错误且包含 'loading model') {
        if (attempt < maxRetries) {
          await sleep(retryDelay)
          continue  // 重试
        }
      }
      throw error
    }
    catch AbortError {
      throw  // 不重试，直接抛出
    }

vLLM 请求格式 (OpenAI 兼容):
  POST /v1/chat/completions
  {
    "model": model,
    "messages": [{ "role": "user", "content": prompt }],
    "stream": true,
    "temperature": temperature
  }
  Headers:
    Content-Type: application/json
    Accept: text/event-stream

Ollama 请求格式:
  POST /api/chat
  {
    "model": model,
    "messages": [{ "role": "user", "content": prompt }],
    "stream": true,
    "options": { "temperature": temperature }
  }
  Headers:
    Content-Type: application/json

返回:
  - 成功：ReadableStream (response.body)
  - 失败：抛出 Error

抛出错误:
  - AbortError (用户取消)
  - HTTP 错误：'HTTP {status}: {errorBody}'
  - 超时：'请求超时，请稍后重试'
```

---

## 六、流式响应解析 (核心)

### 6.1 parseStream() - 解析流

```javascript
// api.js:189-325
async parseStream(stream, onToken, onComplete)

参数:
  - stream: ReadableStream 响应流
  - onToken: (content, tokens, type) => void 每 token 回调
  - onComplete: (stats) => void 完成回调

本地状态:
  accumulatedContent: string  累积内容
  promptTokens: number        输入 token 数
  outputTokens: number        输出 token 数
  startTime: number           开始时间戳
  firstTokenTime: number|null 首 token 时间
  lastTokenTime: number       末 token 时间

处理流程:
  1. reader = stream.getReader()
  2. decoder = new TextDecoder()
  3. while true:
     { done, value } = await reader.read()
     if done → break
     
     chunk = decoder.decode(value, { stream: true })
     
     if apiType === 'vllm':
       parseSSEFormat(chunk)  // OpenAI SSE 格式
     else:
       parseJsonLines(chunk)  // Ollama JSON Lines 格式
  4. 返回 { reader }

onToken 回调参数:
  - content: string 累积内容
  - tokens: number 当前 token 数
  - type: 'content' 类型标记

onComplete 回调参数:
{
  content: string,
  outputTokens: number,
  totalTime: number,
  ttf: number|null,
  speed: number
}
```

### 6.2 vLLM 格式解析 (SSE)

```javascript
// api.js:208-262
parseSSEFormat(chunk)

格式:
data: {"id":"...","choices":[{"delta":{"content":"..."}}],"usage":{...}}
data: [DONE]

解析步骤:
  1. lines = chunk.split('\n')
  
  2. 遍历 lines:
     - 跳过空行
     - 如果 'data: [DONE]' → 调用 onComplete()
     - 如果 'data: ' 开头:
       a. JSON.parse(line.substring(6))
       b. 如果有 data.usage → 提取 token 统计
       c. 如果有 data.choices[0].delta.content → 累积内容
          - 首次内容 → 记录 firstTokenTime
          - 每次内容 → 更新 lastTokenTime
          - 调用 onToken(accumulatedContent, length)
```

### 6.3 Ollama 格式解析 (JSON Lines)

```javascript
// api.js:263-316
parseJsonLines(chunk)

格式:
{"message":{"content":"..."},"eval_count":5,"done":false}
{"message":{"content":"..."},"eval_count":10,"done":true}

解析步骤:
  1. lines = chunk.split('\n')
  
  2. 遍历 lines:
     - 跳过空行
     - JSON.parse(line)
     - 如果有 data.message.content → 累积内容
       - 首次内容 → 记录 firstTokenTime
       - 每次内容 → 更新 lastTokenTime
       - 调用 onToken(accumulatedContent, length)
     - 如果 data.done === true:
       - 提取 data.eval_count 作为 outputTokens
       - 计算统计信息
       - 调用 onComplete()
       - break

差异:
  - vLLM: 最后一个 chunk 包含完整 usage
  - Ollama: done=true 时返回 eval_count (输出 token)
```

---

## 七、指标计算

### 7.1 TTFT (Time To First Token)

```javascript
// api.js:218, 297
ttf = firstTokenTime !== null ? firstTokenTime - startTime : null

说明:
  - startTime: 请求开始时间 (chat() 调用前)
  - firstTokenTime: 第一个非空 token 到达时间
  - 单位：毫秒
  - 为 null 表示未成功获取 token
```

### 7.2 生成速度 (t/s)

```javascript
// api.js:221, 300
generationTime = (lastTokenTime - firstTokenTime) / 1000  // 秒
visibleTokens = outputTokens > 0 ? outputTokens : accumulatedContent.length
speed = visibleTokens / generationTime  // tokens/秒

说明:
  - generationTime: 第一个 token 到最后一个 token 的时间
  - visibleTokens: 优先使用准确 token 数，其次用字符数
  - 单位：tokens/秒
```

### 7.3 总耗时 (totalTime)

```javascript
// api.js:217, 296
totalTime = endTime - startTime  // 毫秒

说明:
  - startTime: 请求开始时间
  - endTime: 最后一个 chunk 处理完成时间
  - 包含网络传输 + 首 token 等待 + 生成时间
```

---

## 八、错误处理

### 8.1 重试机制 (Ollama 模型加载)

```javascript
// api.js:156-181
重试条件:
  1. apiType === Config.apiTypes.OLLAMA
  2. response.status === 500
  3. errorBody.includes('loading model')

重试策略:
  - 最多 5 次
  - 每次延迟 1000ms
  - 仅在模型加载中重试 (避免网络问题死循环)

异常分支:
  - AbortError → 直接抛出 (不重试)
  - 其他网络错误 → 记录日志并抛出
```

### 8.2 JSON 解析容错

```javascript
// api.js:258-260, 312-314
try {
  JSON.parse(...)
} catch (e) {
  // 忽略错误，继续解析下一行
}

说明:
  - SSE/JSON Lines 可能出现部分解析
  - 单个 chunk 解析失败不影响整体流
```

### 8.3 流读取错误

```javascript
// api.js:318-322
catch (error) {
  if (error.name !== 'AbortError') {
    console.error('[API] 流读取错误:', error.message)
  }
}

说明:
  - AbortError 是正常取消，不记录错误
  - 其他错误记录到控制台
```

---

## 九、API 修改指南

| 修改需求 | 修改位置 | 注意事项 |
|------|------|----|
| 添加新 API 类型 | `getApiType()`, `getApiUrl()`, `getModels()`, `chat()`, `parseStream()` | 需要处理格式差异 |
| 修改默认地址 | `config.js` 统一修改 | 注意端口和协议 |
| 调整重试策略 | `chat()` L107-181 | 避免过度重试 |
| 修改超时时间 | `checkConnection()` L33 | 5 秒是合理值 |
| 添加请求头 | `chat()` L127/143 headers | 注意 CORS |
| 修改温度参数 | `chat()` L110 | 传递到后端 |
| 添加 token 统计 | `parseStream()` 对应位置 | 注意格式差异 |
| 修改指标计算 | `parseStream()` onComplete 前 | 注意空值处理 |

---

## 十、性能考虑

### 10.1 流式处理优势

```
传统请求:
  等待全部响应 → 解析 → 返回 → UI 更新

流式请求:
  边接收边解析边更新 → 用户体验更好
```

### 10.2 内存使用

```
accumulatedContent: 
  - 每次 onToken 都会增长
  - 最大长度 = 完整响应内容
  - 建议：如果响应超长，考虑只保留最近 N 个 token
```

### 10.3 性能瓶颈

```
1. JSON.parse: 每 chunk 都解析
   解决：已加 try-catch 容错

2. UI 更新频率: 每个 token 都更新 DOM
   解决：可考虑节流 (throttle) 更新

3. 并发数过大: 浏览器网络限制
   解决：已依赖浏览器自动队列管理
```

---

## 十一、vLLM vs Ollama 对比

| 项目 | vLLM (OpenAI) | Ollama |
|----|----|----|
| 端点 | `/v1/chat/completions` | `/api/chat` |
| 响应格式 | SSE (Server-Sent Events) | JSON Lines |
| Token 统计 | 最后一个 chunk 的 usage | done=true 时的 eval_count |
| 结束标记 | `data: [DONE]` | `"done": true` |
| 温度参数 | `temperature` | `options.temperature` |
| 重试机制 | 无 | 模型加载自动重试 |
| CORS 要求 | 需要服务器配置 | 需要 ollama serve 配置 |

---

## 十二、测试建议

### 12.1 调试技巧

```javascript
// 在浏览器控制台测试
// 1. 检查连接
await API.checkConnection()

// 2. 获取模型列表
const models = await API.getModels()
console.log(models)

// 3. 手动调用 chat
const controller = new AbortController()
const stream = await API.chat("test", "qwen2.5", 0.7, controller)
await API.parseStream(
  stream,
  (content, tokens) => console.log('token:', tokens),
  (stats) => console.log('complete:', stats)
)
```

### 12.2 常见问题排查

```
问题：连接失败
检查:
  1. API 地址是否正确
  2. CORS 是否配置
  3. 网络是否可达

问题：模型列表为空
检查:
  1. 模型是否加载到服务
  2. API 端点是否返回正确格式
  3. 查看 Network 面板响应内容

问题：流式响应不显示
检查:
  1. onToken 回调是否被正确调用
  2. accumulatedContent 是否累积
  3. DOM 是否更新成功

问题：TTFT 为 null
检查:
  1. 是否有 token 被成功接收
  2. firstTokenTime 是否被设置
  3. 响应是否包含内容
```
