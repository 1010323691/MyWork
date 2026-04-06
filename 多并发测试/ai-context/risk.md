# 风险点文档

## 容易出 bug 的地方

### 1. 状态同步问题
**位置**：`js/concurrent.js`、`js/ui.js`

**风险**：Concurrent 状态与 UI 显示不同步

**场景**：
- `runAll()` 结束时调用 `UI.setTesting(false)`，但如果在此之前 UI 状态未正确更新，可能导致按钮状态混乱
- `completedCount` 与 `results` 数组长度可能不一致（如异常中断）

**建议**：修改状态逻辑时，同时检查所有引用该状态的 UI 更新方法

---

### 2. 流式响应解析容错性
**位置**：`js/api.js` `parseStream()`

**风险**：SSE 格式解析对异常数据容错性差

**场景**：
- vLLM 返回非标准 SSE 格式时 JSON.parse 失败
- Ollama 返回空行或非 JSON 行时解析失败
- 当前虽然有 try-catch，但 silent fail 可能隐藏真实问题

**建议**：修改解析逻辑时需同时测试两种 API 类型

---

### 3. AbortController 作用域
**位置**：`js/concurrent.js`、`js/api.js`

**风险**：AbortController 的作用域不一致

**场景**：
- `Concurrent.abortController` 用于停止全部请求
- `runRequest()` 中每个请求也创建独立的 `AbortController`，但未保存引用
- `stop()` 调用 `abort()` 后，已启动的请求可能继续执行

**建议**：当前设计是全局 abort + 每个请求独立超时，修改时需注意一致性

---

### 4. localStorage 读取时序
**位置**：`js/ui.js` `loadSavedConfig()`

**风险**：页面加载时 localStorage 未完全读取

**场景**：
- `App.init()` 调用 `UI.loadSavedConfig()` 是同步的
- 但 `App.loadModels()` 是异步的，模型下拉框可能在配置恢复后才填充
- 如果 `savedModel` 不在新加载的模型列表中，会选择默认值

**建议**：修改配置加载逻辑时，需等待模型列表加载完成后再恢复模型选择

---

### 5. 并发计数逻辑
**位置**：`js/concurrent.js` `runRequest()`

**风险**：`runningCount` 在异步边界可能不准确

**场景**：
- `runningCount++` 在请求开始时
- `runningCount--` 在 `onComplete` 或 catch 中
- 如果 `parseStream()` 抛出未捕获异常，计数可能不归零

**建议**：使用 `try...finally` 确保计数清理

---

## 强耦合区域

### 1. UI ↔ Concurrent 双向调用
**位置**：`js/ui.js`、`js/concurrent.js`

**耦合**：
- `Concurrent.runRequest()` 调用 `UI.updateTaskList()`、`UI.updateTaskProgress()`
- `UI.bindEvents()` 调用 `Concurrent.clear()`、`Concurrent.getResults()`

**影响**：修改一方可能影响另一方

---

### 2. UI ↔ App 双向调用
**位置**：`js/ui.js`、`js/main.js`

**耦合**：
- `UI.bindEvents()` 绑定 `App.startTest()`、`App.stopTest()`、`App.loadModels()`
- `App` 的所有 UI 更新通过 `UI.*` 方法

**影响**：UI 事件与业务逻辑强绑定

---

### 3. API 类型判断分散
**位置**：`js/api.js` 多处

**耦合**：
- `getApiType()` 在 `checkConnection()`、`getModels()`、`chat()`、`parseStream()` 中重复调用
- 每个方法都需根据 `apiType` 分支处理

**影响**：新增 API 类型需修改多个方法

---

## 修改时需要特别小心的逻辑

### 1. runAll() 的异步流程
**文件**：`js/concurrent.js`

**原因**：
- 涉及 `Promise.allSettled`、多个异步回调
- QPS 定时器与任务执行并行
- 最终状态更新依赖所有任务完成

**小心点**：
- 修改时需确保 `isRunning = false` 和 `setTesting(false)` 在正确时机执行
- QPS 定时器的启动/停止需与任务执行对齐

---

### 2. parseStream() 的回调机制
**文件**：`js/api.js`

**原因**：
- `onToken` 和 `onComplete` 回调由外部传入
- 回调中修改 Concurrent 状态和 UI
- 流式数据分块到达，需累积处理

**小心点**：
- 修改时需确保回调的调用时机和参数正确
- vLLM 和 Ollama 的回调触发点不同

---

### 3. 全局对象依赖
**文件**：所有 JS 文件

**原因**：
- `App`、`Concurrent`、`API`、`UI`、`Config` 都是全局对象
- 文件加载顺序依赖 HTML 中的 script 标签顺序

**小心点**：
- 新增模块需注意加载顺序
- 避免在模块初始化时依赖其他模块（应通过函数调用）
