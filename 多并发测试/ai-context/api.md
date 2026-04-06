# API 通信文档

## 文件
- `js/api.js` - API 对象

## 模块职责
- 封装 Ollama 和 vLLM 两种 API 的调用
- 提供流式响应（SSE）解析
- 处理连接检查与模型列表获取
- 实现 Ollama 模型加载的重试机制

## 与其他模块的依赖关系
- **依赖**：`Config`（API 类型枚举、默认 URL）
- **被依赖**：`App`（连接检查、模型加载）、`Concurrent`（聊天请求）
- **独立**：不包含业务逻辑，纯 API 封装

---

## 核心方法

### 配置获取
- `getApiType()` - 获取当前 API 类型（从 localStorage 或默认值）
- `getApiUrl()` - 获取当前 API 地址（从 localStorage 或根据类型返回默认值）

### 连接与模型
- `checkConnection()` - 检查连接：
  - vLLM: `GET /v1/models`
  - Ollama: `GET /api/tags`
  - 5 秒超时

- `getModels()` - 获取模型列表：
  - vLLM: 解析 `{ data: [{ id }] }` 格式
  - Ollama: 解析 `{ models: [{ name }] }` 格式

### 聊天请求（核心）
- `chat(prompt, model, temperature, controller)` - 发送聊天请求：
  - vLLM: `POST /v1/chat/completions`（OpenAI 兼容）
  - Ollama: `POST /api/chat`
  - 支持流式响应（`Accept: text/event-stream`）
  - Ollama 特有：模型加载时重试 5 次（每次间隔 1 秒）

### 流式响应解析（核心）
- `parseStream(stream, onToken, onComplete)` - 解析流式响应：
  - 使用 `TextDecoder` 解码
  - vLLM：解析 SSE 格式（`data: {...}`）
  - Ollama：解析每行 JSON 格式
  - 实时回调 `onToken(content, tokens, type)`
  - 完成回调 `onComplete(stats)`

---

## vLLM 与 Ollama 的差异

### vLLM（OpenAI 兼容）
| 项目 | 值 |
|------|----|
| 模型列表 | `/v1/models` → `{ data: [{ id }] }` |
| 聊天接口 | `/v1/chat/completions` |
| 流格式 | SSE：`data: { choices: [{ delta: { content } }] }` |
| 结束标记 | `data: [DONE]` |
| token 统计 | `usage.completion_tokens`（在最后一个 chunk） |

### Ollama
| 项目 | 值 |
|------|----|
| 模型列表 | `/api/tags` → `{ models: [{ name }] }` |
| 聊天接口 | `/api/chat` |
| 流格式 | 每行 JSON：`{ message: { content }, done: bool }` |
| 结束标记 | `done: true` |
| token 统计 | `eval_count`（在 done 时返回） |

---

## 完成回调数据结构（onComplete）

```javascript
{
  content: string,          // 完整响应内容
  outputTokens: number,     // 输出 token 数
  totalTime: number,        // 总耗时（ms）
  ttf: number | null,       // TTFT（首字时间，ms）
  speed: number             // 生成速度（tokens/s）
}
```

---

## 修改指引

| 问题类型 | 查看位置 |
|----------|----------|
| 连接失败 | `checkConnection()` |
| 模型列表为空 | `getModels()` |
| 请求被拒绝 | `chat()` 中的 fetch 选项 |
| 流式解析错误 | `parseStream()` 中的格式解析 |
| 新增 API 类型 | `getApiType()`、`chat()`、`parseStream()` |
| 重试机制调整 | `chat()` 中的 `maxRetries` |
