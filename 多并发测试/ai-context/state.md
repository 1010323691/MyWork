# 状态管理分析

## 状态载体

项目使用**全局对象**作为状态载体，无框架状态管理。

| 全局对象 | 位置 | 职责 |
|----------|------|------|
| `Config` | `js/config.js` | 常量配置 |
| `API` | `js/api.js` | API 调用逻辑 |
| `Concurrent` | `js/concurrent.js` | 并发测试状态 |
| `UI` | `js/ui.js` | DOM 引用与 UI 逻辑 |
| `App` | `js/main.js` | 业务流程控制 |

## Concurrent 对象状态

### 状态字段

```javascript
Concurrent = {
    // 测试状态
    isRunning: boolean,        // 测试是否进行中
    abortController: AbortController,  // 用于中止请求

    // 任务计数
    tasks: Array,              // 任务列表 [{id, status, result, content, tokens}]
    pendingCount: number,      // 待处理任务数
    runningCount: number,      // 运行中任务数
    completedCount: number,    // 已完成任务数
    totalCount: number,        // 总任务数

    // 结果存储
    results: Array,            // 测试结果数组

    // QPS 统计
    requestTimestamps: Array,  // 请求时间戳列表
    lastQpsCalc: number,       // 上次 QPS 计算时间
    currentQps: number,        // 当前 QPS 值
    qpsTimer: IntervalID,      // QPS 计算定时器
}
```

### 任务状态机

```
pending  →  running  →  completed
                      ↘  error
                      ↘  aborted
```

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `pending` | 等待中 | 任务创建初始状态 |
| `running` | 进行中 | `runRequest()` 开始执行 |
| `completed` | 已完成 | `onComplete` 回调触发 |
| `error` | 错误 | 请求失败 catch 捕获 |
| `aborted` | 已取消 | `AbortError` 捕获 |

### 状态变更函数

| 函数 | 状态变更 |
|------|----------|
| `Concurrent.initialize(count)` | 重置所有状态，创建任务队列 |
| `Concurrent.stop()` | `isRunning = false`, 触发 `abort()` |
| `Concurrent.clear()` | 清空结果和任务 |
| `Concurrent.runRequest(id, config)` | `pending → running → completed/error` |
| `Concurrent.checkAllCompleted()` | 检查是否所有任务完成，若完成则 `isRunning = false` |
| `Concurrent.runAll(config)` | 启动所有并发请求 |
| `Concurrent.startQpsCalc()` | 启动 QPS 计算定时器 |
| `Concurrent.stopQpsCalc()` | 停止 QPS 定时器 |
| `Concurrent.getResults()` | 返回结果副本 |

## Config 对象常量

```javascript
Config = {
    apiTypes: { OLLAMA: 'ollama', VLLM: 'vllm' },
    defaultApiUrl: 'http://192.168.0.119:11434',
    defaultVllmUrl: 'http://127.0.0.1:8000',
    defaultApiType: 'vllm',
    defaultTemperature: 0.7,
    defaultConcurrentCount: 1,
    maxConcurrentCount: 100,
    minConcurrentCount: 1,
    storageKeys: { /* localStorage 键名 */ },
    uiUpdateInterval: 100,        // UI 更新间隔 (ms)
    maxTableRows: 100,            // 表格最大行数
    qpsWindow: 1,                 // QPS 计算窗口 (秒)
    decimalPrecision: 2           // 小数精度
}
```

## localStorage 持久化

| 键名 | 内容 |
|------|------|
| `concurrent_test_api_url` | API 地址 |
| `concurrent_test_api_type` | API 类型 (vllm/ollama) |
| `concurrent_test_model` | 选中的模型 |
| `concurrent_test_prompt` | 测试提示词 |
| `concurrent_test_concurrent_count` | 并发数 |
| `concurrent_test_temperature` | Temperature 值 |

## 状态数据流

```
用户输入
  → DOM change 事件
  → UI.bindEvents() 捕获
  → localStorage.setItem()  持久化
  (下次加载时)
  → UI.loadSavedConfig()
  → DOM 元素恢复值

App.startTest()
  → 读取 DOM 元素值
  → 组装 config 对象
  → Concurrent.initialize()
  → Concurrent.runAll(config)
  → 每个 task 触发 runRequest()
  → API.chat() 发起请求
  → API.parseStream() 解析流
  → onToken 回调 → UI.updateTaskProgress()
  → onComplete 回调 → 更新 result → UI.addResultRow()
```

## 状态同步点

| 状态变更 | UI 同步函数 |
|----------|------------|
| `runningCount` 变更 | `UI.updateConcurrentStatus()` |
| `completedCount` 变更 | `UI.updateMetrics()` |
| task.status 变更 | `UI.updateTaskList()` |
| task.tokens 变更 | `UI.updateTaskProgress()` |
| results.push() | `UI.addResultRow()` |
| 所有任务完成 | `UI.updateSummary()` |
