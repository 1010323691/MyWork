# UI 模块分析

## 文件构成

| 文件 | 职责 |
|------|------|
| `js/ui.js` | DOM 操作、事件绑定、界面渲染 |
| `css/style.css` | 样式表、响应式布局、动画 |
| `index.html` | 页面结构、模块引入顺序 |

## 核心组件

### DOM 元素缓存 (`UI.elements`)

```
connectionStatus     - 连接状态徽章
concurrentStatus     - 并发中状态徽章
apiTypeSelect        - API 类型下拉框
apiUrl               - API 地址输入框
modelSelect          - 模型选择下拉框
refreshBtn           - 刷新模型列表按钮
promptInput          - 测试提示词文本域
concurrentCount      - 并发数输入框
temperature          - Temperature 输入框
startBtn             - 开始测试按钮
stopBtn              - 停止测试按钮
clearBtn             - 清空结果按钮
exportCsvBtn         - 导出 CSV 按钮
concurrentCountDisplay - 当前并发数显示
totalRequests        - 总请求数显示
qps                  - QPS 显示
totalThroughput      - 总吞吐量显示
avgTtf               - 平均 TTFT 显示
avgSpeed             - 平均速度显示
avgTotalTime         - 平均总耗时显示
concurrentTasksList  - 并发任务列表容器
resultsTableBody     - 结果表格 tbody
```

### 核心函数

| 函数 | 作用 | 调用方 |
|------|------|--------|
| `UI.init()` | 初始化 DOM 引用并绑定事件 | `App.init()` |
| `UI.bindEvents()` | 绑定所有事件监听器 | `UI.init()` |
| `UI.updateConnectionStatus(bool, msg)` | 更新连接状态徽章 | `App.checkConnection()`, `App.loadModels()` |
| `UI.setLoading(bool)` | 设置加载状态 (禁用按钮) | `UI.bindEvents()`, `App.loadModels()` |
| `UI.setTesting(bool)` | 设置测试状态 (切换按钮启用/禁用) | `App.startTest()`, `App.stopTest()` |
| `UI.updateConcurrentStatus(count)` | 更新当前并发数显示 | `Concurrent.runRequest()` |
| `UI.updateTotalRequests(count)` | 更新总请求数 | `UI.updateMetrics()` |
| `UI.updateQps(qps)` | 更新 QPS 显示 | `Concurrent.startQpsCalc()` |
| `UI.updateTotalThroughput(throughput)` | 更新总吞吐量 | `UI.updateMetrics()` |
| `UI.updateMetrics(concurrentState)` | 更新指标卡片 | `Concurrent.runRequest()` |
| `UI.updateTaskList()` | 渲染并发任务列表 | `App.startTest()`, `Concurrent.runRequest()` |
| `UI.updateTaskProgress(task)` | 更新任务进度 (tokens) | `Concurrent.runRequest()` |
| `UI.updateTaskStatus(task, status, msg)` | 更新任务状态 | `Concurrent.runRequest()` |
| `UI.updateTaskResult(task, result)` | 更新任务完成结果 | `Concurrent.runRequest()` |
| `UI.clearTaskList()` | 清空任务列表 | `UI.bindEvents()` |
| `UI.resetMetrics()` | 重置所有指标 | `App.startTest()`, `UI.bindEvents()` |
| `UI.addResultRow(result)` | 添加结果行到表格 | `Concurrent.runRequest()` |
| `UI.clearResultsTable()` | 清空结果表格 | `App.startTest()`, `UI.bindEvents()` |
| `UI.updateSummary(results)` | 更新统计汇总 (平均值) | `Concurrent.checkAllCompleted()` |
| `UI.exportToCsv()` | 导出结果为 CSV | `UI.bindEvents()` |
| `UI.loadSavedConfig()` | 从 localStorage 加载配置（API 地址按类型加载默认值） | `App.init()` |

## UI 更新流程

### 用户点击"开始测试"
```
用户点击 startBtn
  → UI.bindEvents() 中的 click 监听器
  → App.startTest()
  → UI.setTesting(true)           // 禁用开始按钮，启用停止按钮
  → UI.clearResultsTable()        // 清空表格
  → UI.resetMetrics()             // 重置指标
  → UI.updateTaskList()           // 渲染任务列表
  → Concurrent.runAll(config)     // 启动并发
```

### 任务执行中实时更新
```
Concurrent.runRequest() 发起请求
  → UI.updateTaskList()           // 任务状态改为 running
  → UI.updateConcurrentStatus()   // 更新当前并发数

API.parseStream() 收到 token
  → onToken 回调
  → UI.updateTaskProgress(task)   // 更新 tokens 显示

API.parseStream() 完成
  → onComplete 回调
  → UI.updateTaskResult()         // 更新最终结果
  → UI.addResultRow()             // 添加到表格
  → UI.updateMetrics()            // 更新指标
  → UI.updateConcurrentStatus()   // 减少并发计数
  → Concurrent.checkAllCompleted()
    → UI.updateSummary()          // 更新统计汇总
```

### 配置变更保存
```
用户修改任意输入框
  → UI.bindEvents() 中的 change 监听器
  → localStorage.setItem()       // 保存到本地存储
```

## 样式关键类

| 类名 | 作用 |
|------|------|
| `.status-badge.connected` | 连接成功 (绿色) |
| `.status-badge.error` | 连接失败 (红色) |
| `.status-badge.active` | 并发进行中 (黄色) |
| `.concurrent-task-item.running` | 任务进行中 |
| `.concurrent-task-item.completed` | 任务完成 |
| `.concurrent-task-item.error` | 任务错误 |
| `.metric-card.highlight` | 高亮指标卡片 |

## 样式修改定位

| 问题类型 | 修改文件 | 搜索关键词 |
|----------|----------|------------|
| 导航栏样式 | `style.css` | `.navbar` |
| 卡片样式 | `style.css` | `.card` |
| 按钮样式 | `style.css` | `.btn` |
| 指标卡片 | `style.css` | `.metric-card` |
| 任务列表 | `style.css` | `.concurrent-task-item` |
| 表格样式 | `style.css` | `.results-table` |
| 响应式布局 | `style.css` | `@media` |
