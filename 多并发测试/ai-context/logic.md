# 业务逻辑分析 (concurrent.js + main.js)

> 并发测试的核心逻辑，包括任务调度、并发控制、结果收集

---

## 一、模块职责

### concurrent.js - 并发测试核心

```
concurrent.js
├── 任务管理
│   ├── initialize()      L27  初始化任务队列
│   ├── runAll()          L188 并行启动所有任务
│   └── runRequest()      L88   单次请求执行
├── 状态控制
│   ├── stop()            L53   停止测试
│   ├── clear()           L64   清空状态
│   └── checkAllCompleted() L76 检查全部完成
├── QPS 统计
│   ├── startQpsCalc()    L224 启动 QPS 计算
│   └── stopQpsCalc()     L252 停止 QPS 计算
└── 数据访问
    └── getResults()      L262 获取测试结果
```

### main.js - 应用入口

```
main.js (App 对象)
├── 初始化
│   └── init()            L16   应用初始化
├── API 连接
│   ├── checkConnection() L31   检查连接
│   └── loadModels()      L47   加载模型列表
├── 测试控制
│   ├── startTest()       L101  开始测试
│   └── stopTest()        L126  停止测试
└── 辅助函数
    ├── validateInput()   L136  输入验证
    └── getTestConfig()   L161  获取测试配置
```

---

## 二、核心业务流程

### 2.1 应用初始化流程

```
页面加载 (DOMContentLoaded)
    │
    ▼
main.js:180 App.init()
    │
    ├──→ ui.js:13 UI.init()
    │   └── 缓存 DOM 元素 + 绑定事件
    │
    ├──→ ui.js:484 UI.loadSavedConfig()
    │   └── 从 localStorage 恢复配置
    │
    ├──→ main.js:32 App.checkConnection()
    │   └── api.js:31 API.checkConnection()
    │       └── 验证 API 可访问
    │
    └──→ main.js:47 App.loadModels()
        └── api.js:67 API.getModels()
            └── 填充模型下拉框
```

### 2.2 开始测试完整流程

```
用户点击"开始测试"按钮
    │
    ▼
ui.js:109 App.startTest()
    │
    ▼
main.js:102 App.startTest()
    │
    ├──→ main.js:102 App.validateInput() [验证]
    │   ├── 检查模型已选择 L137
    │   ├── 检查提示词已输入 L143
    │   └── 检查并发数范围 1-100 L149
    │
    ├──→ main.js:106 App.getTestConfig() [收集配置]
    │   └── 返回 {apiUrl, apiType, model, prompt, concurrentCount, temperature}
    │
    ├──→ main.js:109 Concurrent.initialize(concurrentCount) [初始化]
    │   └── concurrent.js:27
    │       ├── 创建 tasks 数组
    │       ├── 重置计数器
    │       └── 创建 AbortController
    │
    ├──→ main.js:112 UI.setTesting(true) [UI 状态]
    │   └── ui.js:166 禁用配置表单，启用停止按钮
    │
    ├──→ main.js:113 UI.clearResultsTable() [清空表格]
    │
    ├──→ main.js:114 UI.resetMetrics() [重置指标]
    │
    ├──→ main.js:117 UI.updateTaskList() [显示任务列表]
    │
    └──→ main.js:120 Concurrent.runAll(config) [执行并发]
        └── concurrent.js:188
            ├── startQpsCalc() 启动 QPS 定时器
            ├── 并行启动所有任务 (Promise.allSettled)
            └── 等待完成后更新 UI
```

---

## 三、并发执行机制

### 3.1 runAll() - 并行调度

```javascript
// concurrent.js:188-219
async runAll(config)

执行流程:
  1. totalCount = tasks.length
  2. completedCount = 0
  3. runningCount = 0
  4. pendingCount = tasks.length
  5. startQpsCalc()  // 启动 QPS 统计
  6. 记录启动时间
  7. 创建 Promise 数组:
     promises = tasks.map(task => {
       pendingCount--
       return runRequest(task.id, config)
     })
  8. Promise.allSettled(promises)  // 等待所有完成
  9. 记录结束时间
  10. stopQpsCalc()  // 停止 QPS 统计
  11. isRunning = false
  12. abortController = null
  13. UI.updateConcurrentStatus(0)
  14. UI.updateSummary(results)

关键点:
  - 所有任务几乎同时启动 (真正的并发)
  - Promise.allSettled 确保单个失败不影响其他
  - 不限制同时进行的请求数 (依赖服务器承受能力)
```

### 3.2 runRequest() - 单次请求

```javascript
// concurrent.js:88-183
async runRequest(id, config)

执行流程:
  1. 查找任务：task = tasks.find(t => t.id === id)
  2. 状态更新：task.status = 'running'
  3. 计数器：runningCount++
  4. UI 更新：UI.updateTaskList()
  5. UI 更新：UI.updateConcurrentStatus(runningCount)
  6. 记录开始时间：startTime = Date.now()
  7. 创建 AbortController (单个请求可用)
  8. 调用 API:
     stream = await API.chat(prompt, model, temperature, controller)
  9. 记录 QPS 时间戳：requestTimestamps.push(Date.now())
  10. 解析流式响应:
      await API.parseStream(stream, onToken, onComplete)
      ├── onToken: 实时更新任务进度
      └── onComplete: 任务完成处理
  11. 异常处理:
      catch AbortError → task.status = 'aborted'
      catch 其他错误  → task.status = 'error'
  12. 完成检查：checkAllCompleted()

完成回调 (onComplete) 执行:
  1. endTime = Date.now()
  2. completedCount++
  3. runningCount--
  4. 构建 Result 对象
  5. task.status = 'completed'
  6. task.result = result
  7. results.push(result)
  8. UI.updateTaskList()
  9. UI.updateTaskResult(task, result)
  10. UI.addResultRow(result)
  11. UI.updateConcurrentStatus(runningCount)
  12. UI.updateMetrics(this)
  13. checkAllCompleted() → UI.updateSummary()
```

---

## 四、任务状态管理

### 4.1 状态流转

```
初始化:
  Concurrent.initialize()
  ↓
  tasks[i].status = 'pending'

开始执行:
  runRequest() 开始
  ↓
  tasks[i].status = 'running'
  runningCount++

正常完成:
  API.parseStream() onComplete 回调
  ↓
  tasks[i].status = 'completed'
  tasks[i].result = {id, model, tokens, speed, ttf, ...}
  results.push(result)
  runningCount--
  completedCount++

错误完成:
  try-catch 捕获错误
  ↓
  tasks[i].status = 'error'
  runningCount--
  completedCount++

用户停止:
  Concurrent.stop() → abortController.abort()
  ↓
  tasks[i].status = 'aborted'
  runningCount--
  completedCount++
```

### 4.2 checkAllCompleted() - 完成检查

```javascript
// concurrent.js:76-83
checkAllCompleted()

逻辑:
  if (completedCount === tasks.length) {
    isRunning = false
    abortController = null
    return true
  }
  return false

调用时机:
  - 每个任务完成后调用
  - 用于触发最终的 UI.updateSummary()
```

---

## 五、停止机制

### 5.1 stop() - 停止测试

```javascript
// concurrent.js:53-59
stop()

操作:
  1. isRunning = false
  2. if (abortController) {
       abortController.abort()
       abortController = null
     }

影响:
  - 正在进行的 API.chat() 请求会抛出 AbortError
  - runRequest() catch 分支捕获 → task.status = 'aborted'
  - 已完成的任务不受影响
```

### 5.2 停止流程

```
用户点击"停止"按钮
    │
    ▼
ui.js:114 App.stopTest()
    │
    ▼
main.js:126 App.stopTest()
    │
    ├──→ confirm() 确认弹窗
    │
    ├──→ concurrent.js:53 Concurrent.stop()
    │   ├── isRunning = false
    │   └── abortController.abort()
    │
    └──→ ui.js:166 UI.setTesting(false)
        └── 恢复表单可编辑
```

---

## 六、输入验证

### 6.1 validateInput() - 验证规则

```javascript
// main.js:136-156
validateInput()

验证项:
  1. 模型选择
     - 条件：UI.elements.modelSelect.value 非空
     - 错误提示："请选择一个模型"
  
  2. 提示词输入
     - 条件：UI.elements.promptInput.value.trim() 非空
     - 错误提示："请输入测试提示词"
  
  3. 并发数范围
     - 条件：1 <= concurrentCount <= 100
     - 错误提示："并发数必须在 1-100 之间"

返回:
  - 全部通过：true
  - 任一项失败：false (并显示 alert)
```

### 6.2 getTestConfig() - 配置收集

```javascript
// main.js:161-170
getTestConfig()

返回对象:
{
  apiUrl:          UI.elements.apiUrl.value || Config.defaultApiUrl,
  apiType:         UI.elements.apiTypeSelect.value || Config.defaultApiType,
  model:           UI.elements.modelSelect.value,
  prompt:          UI.elements.promptInput.value.trim(),
  concurrentCount: parseInt(UI.elements.concurrentCount.value) || Config.defaultConcurrentCount,
  temperature:     parseFloat(UI.elements.temperature.value) || Config.defaultTemperature
}

默认值来源:
  - Config.defaultApiUrl (Ollama: http://192.168.0.119:11434)
  - Config.defaultVllmUrl (vLLM: http://127.0.0.1:8000)
  - Config.defaultApiType ('vllm')
  - Config.defaultConcurrentCount (1)
  - Config.defaultTemperature (0.7)
```

---

## 七、QPS 统计逻辑

### 7.1 startQpsCalc() - 启动 QPS 计算

```javascript
// concurrent.js:224-247
startQpsCalc()

定时器:
  setInterval(calcQps, Config.uiUpdateInterval)  // 每 100ms 执行
  
计算函数 calcQps():
  1. if (!isRunning) return
  
  2. now = Date.now()
  
  3. windowMs = Config.qpsWindow * 1000  // 1000ms
  
  4. 过滤旧时间戳:
     requestTimestamps = requestTimestamps.filter(
       ts => now - ts <= windowMs
     )
  
  5. 计算 QPS:
     currentQps = requestTimestamps.length / Config.qpsWindow
  
  6. 更新 UI:
     UI.updateQps(currentQps)
  
  7. lastQpsCalc = now

时间戳记录位置:
  - runRequest() L115: requestTimestamps.push(Date.now())
  - 在 API.chat() 调用后立即记录 (请求开始)
```

### 7.2 QPS 计算说明

```
定义:
  QPS = 过去 N 秒内启动的请求数 / N

当前配置:
  N = Config.qpsWindow = 1 秒

示例:
  t=0ms:    启动 10 个请求 → timestamps = [0, 1, 2, ..., 9]
  t=100ms:  计算 QPS → 10 个时间戳都在窗口内 → QPS = 10
  t=1000ms: 计算 QPS → 只有 t>=0 的时间戳在窗口内 → QPS = 10
  t=1001ms: 计算 QPS → t=0 的时间戳过期 → QPS = 9
```

---

## 八、结果统计计算

### 8.1 吞吐量计算 (ui.js:239-242)

```javascript
// 总吞吐量 = 所有请求的总 tokens / 总耗时 * 1000

totalTokens = Σ(results[i].outputTokens)
totalTime   = Σ(results[i].totalTime)
throughput  = (totalTokens / totalTime) * 1000  // tokens/秒
```

### 8.2 平均指标计算 (ui.js:405-427)

```javascript
// 平均速度 = Σ(speed) / count
avgSpeed = totalSpeed / results.length

// 平均 TTFT = Σ(ttf) / 有效 count
validTtfCount = results.filter(r => r.ttf !== null).length
avgTtf = totalTtf / validTtfCount  // 过滤 null

// 平均总耗时 = Σ(totalTime) / count
avgTotalTime = totalTotalTime / results.length
```

### 8.3 单次请求指标 (api.js:295-300)

```javascript
// TTFT (Time To First Token)
ttf = firstTokenTime !== null ? firstTokenTime - startTime : null

// 生成时间
generationTime = (lastTokenTime - firstTokenTime) / 1000  // 秒

// 生成速度
speed = outputTokens / generationTime  // tokens/秒

// 总耗时
totalTime = endTime - startTime  // 毫秒
```

---

## 九、逻辑修改指南

| 修改需求 | 修改位置 | 注意事项 |
|------|------|----|
| 修改并发策略 | `concurrent.js:runAll()` | 可改为限流队列 |
| 添加进度回调 | `runRequest()` 添加回调参数 | 注意性能影响 |
| 修改验证规则 | `main.js:validateInput()` | 保持用户提示友好 |
| 添加新指标 | `concurrent.js` 状态 + `api.js` 计算 + `ui.js` 显示 | 三个模块协同修改 |
| 修改停止行为 | `concurrent.js:stop()` | 考虑优雅关闭 |
| 添加重试逻辑 | `runRequest()` catch 分支 | 注意死循环风险 |
| 修改默认值 | `config.js` 统一修改 | 保持前后一致 |
| 添加日志级别 | `console.log` 包裹条件 | 方便调试开关 |

---

## 十、调用关系图

```
App (main.js)
│
├── init()
│   ├── UI.init()
│   ├── UI.loadSavedConfig()
│   ├── API.checkConnection()
│   └── API.getModels()
│
├── startTest()
│   ├── validateInput()
│   ├── getTestConfig()
│   ├── Concurrent.initialize()
│   ├── UI.setTesting()
│   ├── UI.clearResultsTable()
│   ├── UI.resetMetrics()
│   ├── UI.updateTaskList()
│   └── Concurrent.runAll()
│
└── stopTest()
    ├── Concurrent.stop()
    └── UI.setTesting()

Concurrent (concurrent.js)
│
├── initialize()
│   └── 创建任务队列
│
├── runAll()
│   ├── startQpsCalc()
│   └── runRequest() × N
│
├── runRequest()
│   ├── API.chat()
│   └── API.parseStream()
│       ├── onToken → UI.updateTaskProgress()
│       └── onComplete → UI.addResultRow() + UI.updateMetrics()
│
└── stop()
    └── abortController.abort()
```
