# 核心业务逻辑分析

## 文件构成

| 文件 | 职责 |
|------|------|
| `js/main.js` | 应用入口、业务流程控制 |
| `js/concurrent.js` | 并发任务调度、请求管理 |

## App 对象 (main.js)

### 核心函数

| 函数 | 作用 | 关键逻辑 |
|------|------|----------|
| `App.init()` | 应用初始化 | 初始化 UI → 加载配置 → 检查连接 → 加载模型 |
| `App.checkConnection()` | 检查 API 连接 | 调用 `API.checkConnection()` |
| `App.loadModels()` | 加载模型列表 | 调用 `API.getModels()` → 渲染下拉框 |
| `App.startTest()` | 开始测试 | 验证输入 → 获取配置 → 初始化并发 → 运行 |
| `App.stopTest()` | 停止测试 | 调用 `Concurrent.stop()` |
| `App.validateInput()` | 输入验证 | 检查模型/提示词/并发数 |
| `App.getTestConfig()` | 获取测试配置 | 从 DOM 读取配置组装对象 |

### 初始化流程

```
DOMContentLoaded 事件
  → App.init()
  → UI.init()                    // 初始化 DOM 引用
  → UI.loadSavedConfig()         // 加载本地配置
  → App.checkConnection()
    → API.checkConnection()
    → UI.updateConnectionStatus()
  → App.loadModels()
    → API.getModels()
    → 渲染 modelSelect 下拉框
    → UI.updateConnectionStatus(true)
```

## Concurrent 对象 (concurrent.js)

### 核心函数

| 函数 | 作用 | 关键逻辑 |
|------|------|----------|
| `Concurrent.initialize(count)` | 初始化测试 | 创建任务队列，重置状态 |
| `Concurrent.runAll(config)` | 运行所有并发请求 | Promise.allSettled 并发执行 |
| `Concurrent.runRequest(id, config)` | 运行单次请求 | 调用 API → 解析流 → 更新状态 |
| `Concurrent.stop()` | 停止测试 | 设置 isRunning=false, abort() |
| `Concurrent.clear()` | 清空结果 | 清空所有状态 |
| `Concurrent.checkAllCompleted()` | 检查是否全部完成 | completedCount === tasks.length |
| `Concurrent.startQpsCalc()` | 启动 QPS 计算 | setInterval 定时计算 |
| `Concurrent.getResults()` | 获取结果副本 | 返回 results 数组副本 |

### 并发执行流程

```
App.startTest()
  → Concurrent.initialize(concurrentCount)
    → 创建 tasks 数组 [ {id:1, status:'pending'}, ... ]
    → 重置计数器和 results

  → Concurrent.runAll(config)
    → startQpsCalc()              // 启动 QPS 定时器
    → Promise.allSettled(tasks.map(runRequest))
      → 每个任务调用 runRequest(id, config)

Concurrent.runRequest(id, config)
  → task.status = 'running'
  → runningCount++
  → UI.updateTaskList()
  → UI.updateConcurrentStatus(runningCount)

  → API.chat(prompt, model, temperature, controller)
    → 返回 ReadableStream

  → API.parseStream(stream, onToken, onComplete)
    → 读取流数据
    → 每收到 token → onToken(content, tokens, type)
      → task.tokens = tokens
      → UI.updateTaskProgress(task)

    → 流结束 → onComplete(stats)
      → 组装 result 对象
      → results.push(result)
      → task.status = 'completed'
      → completedCount++
      → runningCount--
      → UI.addResultRow(result)
      → UI.updateMetrics()
      → checkAllCompleted()
        → 若全部完成 → UI.updateSummary()
```

### QPS 计算逻辑

```
startQpsCalc()
  → setInterval(calcQps, 100ms)

calcQps() 每 100ms 执行:
  → now = Date.now()
  → 过滤窗口外的时间戳 (默认 1 秒窗口)
  → currentQps = 窗口内请求数 / 窗口秒数
  → UI.updateQps(currentQps)
```

## 关键调用链

### 完整测试流程

```
1. 用户点击"开始测试"按钮
   index.html#L76 <startBtn>

2. UI.bindEvents() 中的 click 监听器触发
   ui.js#L108
   → App.startTest()

3. App.validateInput() 验证输入
   main.js#L136
   - 检查模型是否选择
   - 检查提示词是否有值
   - 检查并发数是否在 1-100 之间

4. App.getTestConfig() 获取配置
   main.js#L161
   → 返回 { apiUrl, apiType, model, prompt, concurrentCount, temperature }

5. Concurrent.initialize(concurrentCount)
   concurrent.js#L27
   → 创建任务队列
   → 重置状态

6. Concurrent.runAll(config)
   concurrent.js#L188
   → startQpsCalc() 启动 QPS 计算
   → Promise.allSettled() 并发执行所有任务

7. Concurrent.runRequest(id, config) 对每个任务
   concurrent.js#L88
   → API.chat() 发起请求
   → API.parseStream() 解析流式响应
   → onToken 回调更新 UI
   → onComplete 回调保存结果

8. 所有任务完成后
   concurrent.js#L76 checkAllCompleted()
   → UI.updateSummary() 更新统计汇总
   → UI.setTesting(false) 恢复按钮状态
```

## 数据计算逻辑

### 速度计算 (api.js#L219-221)
```javascript
generationTime = (lastTokenTime - firstTokenTime) / 1000  // 秒
visibleTokens = outputTokens > 0 ? outputTokens : accumulatedContent.length
speed = visibleTokens / generationTime  // tokens/秒
```

### TTFT 计算 (api.js#L218)
```javascript
ttf = firstTokenTime !== null ? firstTokenTime - startTime : null  // 毫秒
```

### 总吞吐量计算 (ui.js#L239-241)
```javascript
totalTokens = results.reduce((sum, r) => sum + r.outputTokens, 0)
totalTime = results.reduce((sum, r) => sum + r.totalTime, 0)
throughput = (totalTokens / totalTime) * 1000  // tokens/秒
```

### 平均统计计算 (ui.js#L396-428)
```javascript
avgSpeed = results.reduce((sum, r) => sum + r.speed, 0) / results.length
avgTtf = validTtfCount > 0 ? totalTtf / validTtfCount : null
avgTotalTime = totalTotalTime / results.length
```
