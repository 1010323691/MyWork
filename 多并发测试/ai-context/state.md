# 状态管理分析

> 本项目采用扁平化的全局状态管理，通过全局对象和 localStorage 实现状态共享

---

## 一、状态存储概览

### 状态分层架构

```
┌─────────────────────────────────────────────┐
│            持久化状态层                      │
│          localStorage (键值对)              │
│  - 用户配置 (API 地址、模型、提示词等)          │
└─────────────────────────────────────────────┘
                   ↕ 同步
┌─────────────────────────────────────────────┐
│            UI 状态层                         │
│      UI.elements[].value (表单值)            │
│      UI.elements[].textContent (显示值)       │
└─────────────────────────────────────────────┘
                   ↕ 读取/更新
┌─────────────────────────────────────────────┐
│          运行时状态层                        │
│   - Concurrent.tasks[] (任务状态)            │
│   - Concurrent.results[] (测试结果)          │
│   - Concurrent 计数器 (pending/running/completed)│
└─────────────────────────────────────────────┘
```

---

## 二、持久化状态 (localStorage)

### 2.1 状态键名定义 (config.js:25-32)

```javascript
Config.storageKeys = {
    apiUrl:         'concurrent_test_api_url',
    apiType:        'concurrent_test_api_type',
    model:          'concurrent_test_model',
    prompt:         'concurrent_test_prompt',
    concurrentCount: 'concurrent_test_concurrent_count',
    temperature:    'concurrent_test_temperature'
}
```

### 2.2 状态读写位置

| 状态名 | localStorage 键 | 写入位置 | 读取位置 |
|------|----|----|----|
| API 类型 | `concurrent_test_api_type` | `ui.js:58` (change 事件) | `ui.js:486` (loadSavedConfig) |
| API 地址 | `concurrent_test_api_url` | `ui.js:74` (change 事件) | `ui.js:492` (loadSavedConfig) |
| 模型 | `concurrent_test_model` | `ui.js:79` (change 事件) | `ui.js:498` (loadSavedConfig) |
| 提示词 | `concurrent_test_prompt` | `ui.js:84` (change 事件) | `ui.js:504` (loadSavedConfig) |
| 并发数 | `concurrent_test_concurrent_count` | `ui.js:93` (change 事件) | `ui.js:510` (loadSavedConfig) |
| Temperature | `concurrent_test_temperature` | `ui.js:98` (change 事件) | `ui.js:516` (loadSavedConfig) |

### 2.3 状态同步流程图

```
用户修改表单元素
    │
    ▼
UI.bindEvents() 捕获 change 事件
    │
    ▼
localStorage.setItem(Config.storageKeys.xxx, value)
    │
    ▼ (下次页面加载)
UI.loadSavedConfig()
    │
    ▼
读取 localStorage.getItem(Config.storageKeys.xxx)
    │
    ▼
设置 UI.elements.xxx.value = savedValue
```

---

## 三、运行时状态 (Concurrent 对象)

### 3.1 状态结构 (concurrent.js:6-25)

```javascript
const Concurrent = {
    // 测试状态
    isRunning:        boolean      // 测试是否进行中
    abortController:  AbortController | null
    
    // 并发任务管理
    tasks:            Task[]       // 任务队列
    pendingCount:     number       // 等待中任务数
    runningCount:     number       // 进行中任务数
    completedCount:   number       // 已完成任务数
    totalCount:       number       // 总任务数
    
    // 结果存储
    results:          Result[]     // 测试结果数组
    
    // QPS 统计
    requestTimestamps:number[]     // 请求时间戳数组
    lastQpsCalc:      number       // 上次 QPS 计算时间
    currentQps:       number       // 当前 QPS
}
```

### 3.2 Task 对象结构

```javascript
{
    id:           number      // 任务 ID (1-based)
    status:       string      // 'pending' | 'running' | 'completed' | 'error' | 'aborted'
    result:       Result | null
    content:      string      // 流式内容 (临时)
    tokens:       number      // token 数 (临时)
    startTime:    number      // 开始时间戳 (临时)
}
```

### 3.3 Result 对象结构

```javascript
{
    id:           number      // 任务 ID
    model:        string      // 模型名称
    inputTokens:  number      // 输入 token 数 (当前固定为 0)
    outputTokens: number      // 输出 token 数
    totalTime:    number      // 总耗时 (ms)
    speed:        number      // 生成速度 (t/s)
    ttf:          number|null // TTFT (ms)
    timestamp:    number      // 请求时间戳
    content:      string      // 完整响应内容
}
```

---

## 四、状态初始化

### 4.1 Concurrent.initialize() - 测试前初始化

```javascript
// concurrent.js:27-47
Concurrent.initialize(concurrentCount)

重置状态:
  1. isRunning = true
  2. abortController = new AbortController()
  3. tasks = [] (新建任务队列)
  4. pendingCount = 0
  5. runningCount = 0
  6. completedCount = 0
  7. totalCount = 0
  8. results = []
  9. requestTimestamps = []
  10. lastQpsCalc = Date.now()
  11. currentQps = 0

创建任务:
  for i = 1 to concurrentCount:
    tasks.push({
      id: i,
      status: 'pending',
      result: null
    })
```

### 4.2 Concurrent.clear() - 清空状态

```javascript
// concurrent.js:64-71
Concurrent.clear()

重置状态:
  1. results = []
  2. tasks = []
  3. pendingCount = 0
  4. runningCount = 0
  5. completedCount = 0
  6. totalCount = 0

注意：不清除 isRunning 和 abortController
```

---

## 五、状态流转

### 5.1 任务状态流转

```
┌──────────────────────────────────────────────────────┐
│                    任务生命周期                       │
└──────────────────────────────────────────────────────┘

初始化 (Concurrent.initialize)
    │
    ▼
┌──────────┐
│  pending │ ← 任务创建
└──────────┘
    │
    ▼ (Concurrent.runRequest 开始)
┌──────────┐
│ running  │ ← 请求进行中
└──────────┘
    │
    ├────────────────────┬─────────────────────┐
    ▼                    ▼                     ▼
┌──────────┐      ┌──────────┐        ┌──────────┐
│completed │      │  error   │        │ aborted  │
└──────────┘      └──────────┘        └──────────┘
    │                    │                     │
    └────────────────────┴─────────────────────┘
                         │
                         ▼ (所有任务结束)
                 Concurrent.isRunning = false
```

### 5.2 状态更新触发点

| 状态变更 | 触发函数 | 触发位置 | 副作用 |
|------|------|------|----|
| `pending → running` | `runRequest()` L88 | L92 | UI.updateTaskList() |
| `running → completed` | `parseStream()` onComplete | L148-149 | UI.updateTaskList() + UI.addResultRow() |
| `running → error` | `runRequest()` catch | L170-175 | UI.updateTaskStatus() |
| `running → aborted` | `runRequest()` catch AbortError | L165-169 | UI.updateTaskStatus() |
| `runningCount++` | `runRequest()` L88 | L93 | UI.updateConcurrentStatus() |
| `runningCount--` | `runRequest()` onComplete | L134 | UI.updateConcurrentStatus() |
| `completedCount++` | `runRequest()` 完成/错误 | L133/167/171 | checkAllCompleted() |
| `results.push()` | `runRequest()` onComplete | L150 | 累积结果 |

---

## 六、计数器同步逻辑

### 6.1 计数器关系

```javascript
// 不变量:
totalCount === pendingCount + runningCount + completedCount

// 初始化后:
totalCount === concurrentCount
pendingCount === 0 (立即变为 running)
runningCount === concurrentCount
completedCount === 0

// 任务完成时:
runningCount--
completedCount++

// 所有任务完成时:
completedCount === totalCount
```

### 6.2 checkAllCompleted() - 完成检查

```javascript
// concurrent.js:76-83
checkAllCompleted()

判断:
  if (completedCount === tasks.length) {
    isRunning = false
    abortController = null
    return true
  }
  return false

调用位置:
  - runRequest() onComplete 回调 L158
  - runRequest() error catch L179
```

---

## 七、QPS 统计状态

### 7.1 QPS 计算逻辑

```javascript
// concurrent.js:224-247
startQpsCalc()

定时执行 (Config.uiUpdateInterval = 100ms):
  1. now = Date.now()
  2. 过滤 requestTimestamps (移除 > qpsWindow 秒前的)
  3. currentQps = requestTimestamps.length / qpsWindow
  4. UI.updateQps(currentQps)

请求开始时记录:
  - runRequest() L115: requestTimestamps.push(Date.now())
```

### 7.2 QPS 窗口配置

```javascript
// config.js:41
Config.qpsWindow = 1  // 1 秒窗口

含义:
  - 统计过去 1 秒内的请求数
  - 每个请求开始时在 L115 记录时间戳
```

---

## 八、UI 状态同步

### 8.1 UI 状态与运行时状态映射

| UI 显示元素 | 数据源 | 更新函数 |
|------|------|----|
| 并发数显示 | `Concurrent.runningCount` | `UI.updateConcurrentStatus()` |
| 总请求数 | `Concurrent.completedCount` | `UI.updateTotalRequests()` |
| QPS | `Concurrent.currentQps` | `UI.updateQps()` |
| 总吞吐量 | `Concurrent.results[]` 计算 | `UI.updateTotalThroughput()` |
| 任务列表 | `Concurrent.tasks[]` | `UI.updateTaskList()` |
| 结果表格 | `Concurrent.results[]` | `UI.addResultRow()` |
| 平均指标 | `Concurrent.results[]` 计算 | `UI.updateSummary()` |

### 8.2 UI 更新频率

| 更新类型 | 触发方式 | 频率 |
|------|------|----|
| 任务状态 | 任务状态变更 | 按需 |
| QPS | setInterval | 100ms |
| 并发数 | 任务开始/完成 | 按需 |
| 结果行 | 任务完成 | 按需 |
| 平均指标 | 所有任务完成 | 按需 |

---

## 九、状态修改指南

| 修改需求 | 修改位置 | 注意事项 |
|------|------|----|
| 新增持久化配置 | `config.js:storageKeys` + `ui.js:bindEvents()` | 同时添加保存和加载逻辑 |
| 修改任务状态枚举 | `concurrent.js:task.status` + `ui.js:updateTaskList()` | 保持状态映射完整 |
| 新增统计指标 | `Concurrent` 添加字段 + `UI.updateXxx()` | 考虑实时更新的性能 |
| 修改 QPS 窗口 | `config.js:qpsWindow` | 影响统计准确性 |
| 修改定时器间隔 | `config.js:uiUpdateInterval` | 影响 UI 流畅度 |
| 添加状态字段 | `Concurrent` 对象 + `initialize()` 初始化 | 注意 clear() 也要重置 |

---

## 十、状态一致性问题

### 10.1 潜在不一致场景

1. **页面刷新**: 运行时状态丢失，但 localStorage 保留
2. **并发数超过 100**: UI 限制在 `ui.js:91`，但需要验证
3. **同时点击开始和停止**: `abortController.abort()` 可能无法中断所有请求
4. **结果表格行数限制**: `config.js:38` maxTableRows 超出后旧数据丢失

### 10.2 状态恢复策略

当前无状态恢复机制，建议:
- 页面刷新前提示用户
- 考虑将 results 也持久化到 localStorage
- 添加 "继续测试" 功能
