# UI 模块分析 (ui.js)

> 负责所有 DOM 操作、事件绑定、界面渲染

---

## 一、模块结构

```
UI 模块
├── elements (L8)           # DOM 元素缓存对象
├── init() (L13)            # 初始化 DOM 引用
├── bindEvents() (L54)      # 事件监听器绑定
├── 状态显示函数族           # 更新各类状态显示
│   ├── updateConnectionStatus() L137
│   ├── setLoading() L154
│   ├── setTesting() L166
│   ├── updateConcurrentStatus() L198
│   └── updateQps() L216
├── 任务管理函数族           # 任务列表渲染
│   ├── updateTaskList() L248
│   ├── updateTaskProgress() L301
│   ├── updateTaskStatus() L311
│   ├── updateTaskResult() L325
│   └── clearTaskList() L335
├── 结果渲染函数族           # 测试结果渲染
│   ├── addResultRow() L354
│   ├── clearResultsTable() L387
│   └── updateSummary() L396
├── 指标更新函数             # 实时指标
│   ├── resetMetrics() L344
│   ├── updateMetrics() L234
│   └── updateTotalThroughput() L225
├── 工具函数族               # 辅助功能
│   ├── exportToCsv() L433
│   ├── formatTime() L473
│   └── loadSavedConfig() L484
```

---

## 二、DOM 元素映射表

| elements 键名 | HTML ID | 类型 | 用途 |
|-----|---------|------|------|
| `connectionStatus` | `connectionStatus` | span | 连接状态徽章 |
| `concurrentStatus` | `concurrentStatus` | span | 并发中状态徽章 |
| `apiTypeSelect` | `apiTypeSelect` | select | API 类型选择 |
| `apiUrl` | `apiUrl` | input | API 地址输入 |
| `modelSelect` | `modelSelect` | select | 模型选择 |
| `refreshBtn` | `refreshBtn` | button | 刷新模型按钮 |
| `promptInput` | `promptInput` | textarea | 提示词输入 |
| `concurrentCount` | `concurrentCount` | input | 并发数输入 |
| `temperature` | `temperature` | input | Temperature 输入 |
| `startBtn` | `startBtn` | button | 开始测试按钮 |
| `stopBtn` | `stopBtn` | button | 停止测试按钮 |
| `clearBtn` | `clearBtn` | button | 清空结果按钮 |
| `exportCsvBtn` | `exportCsvBtn` | button | 导出 CSV 按钮 |
| `concurrentCountDisplay` | `concurrentCountDisplay` | div | 并发数显示 |
| `totalRequests` | `totalRequests` | div | 总请求数显示 |
| `qps` | `qps` | div | QPS 显示 |
| `totalThroughput` | `totalThroughput` | div | 总吞吐量显示 |
| `avgTtf` | `avgTtf` | div | 平均 TTFT 显示 |
| `avgSpeed` | `avgSpeed` | div | 平均速度显示 |
| `avgTotalTime` | `avgTotalTime` | div | 平均总耗时显示 |
| `concurrentTasksList` | `concurrentTasksList` | div | 任务列表容器 |
| `resultsTableBody` | `resultsTableBody` | tbody | 结果表格主体 |

---

## 三、事件绑定详解

### 3.1 配置变更事件

```javascript
// L56-70: API 类型切换
apiTypeSelect.change → 
  1. localStorage 保存
  2. 更新默认 API 地址
  3. UI.setLoading(true)
  4. App.loadModels()

// L73-75: API 地址变更
apiUrl.change → localStorage 保存

// L78-80: 模型选择变更
modelSelect.change → localStorage 保存

// L83-85: 提示词变更
promptInput.change → localStorage 保存

// L88-94: 并发数变更
concurrentCount.change → 
  1. 范围限制 (1-100)
  2. localStorage 保存

// L97-99: Temperature 变更
temperature.change → localStorage 保存
```

### 3.2 操作按钮事件

```javascript
// L102-105: 刷新按钮
refreshBtn.click → 
  UI.setLoading(true)
  App.loadModels()

// L108-110: 开始按钮
startBtn.click → App.startTest()

// L113-115: 停止按钮
stopBtn.click → App.stopTest()

// L118-126: 清空按钮
clearBtn.click → 
  1. confirm 确认
  2. Concurrent.clear()
  3. UI.clearResultsTable()
  4. UI.clearTaskList()
  5. UI.resetMetrics()
  6. UI.updateSummary([])

// L129-131: 导出 CSV 按钮
exportCsvBtn.click → UI.exportToCsv()
```

---

## 四、状态更新函数详解

### 4.1 连接状态

```javascript
// L137-149
updateConnectionStatus(isConnected, message)
参数:
  - isConnected: boolean 是否连接成功
  - message: string 状态文本

DOM 操作:
  - isConnected=true → class='status-badge connected', text='已连接'
  - isConnected=false → class='status-badge error', text=message||'未连接'
```

### 4.2 加载状态

```javascript
// L154-161
setLoading(isLoading)
参数:
  - isLoading: boolean

DOM 操作:
  - refreshBtn.disabled = isLoading
  - startBtn.disabled = isLoading
```

### 4.3 测试状态

```javascript
// L166-193
setTesting(isTesting)
参数:
  - isTesting: boolean

DOM 操作:
  - startBtn.disabled = isTesting
  - stopBtn.disabled = !isTesting
  - modelSelect.disabled = isTesting
  - refreshBtn.disabled = isTesting
  - concurrentCount.disabled = isTesting
  - concurrentStatus 显示/隐藏
```

### 4.4 并发状态

```javascript
// L198-202
updateConcurrentStatus(count)
参数:
  - count: number 当前并发数

DOM 操作:
  - concurrentCountDisplay.textContent = count
```

### 4.5 QPS 更新

```javascript
// L216-220
updateQps(qps)
参数:
  - qps: number

DOM 操作:
  - qps.textContent = qps.toFixed(1)
```

### 4.6 总吞吐量更新

```javascript
// L225-229
updateTotalThroughput(throughput)
参数:
  - throughput: number

DOM 操作:
  - totalThroughput.textContent = throughput.toFixed(0)
```

---

## 五、指标更新逻辑

### 5.1 updateMetrics() - 实时更新指标

```javascript
// L234-243
updateMetrics(concurrentState)
参数:
  - concurrentState: Concurrent 对象引用

计算逻辑:
  1. 总请求数 = concurrentState.completedCount
  2. 总 Tokens = Σ(concurrentState.results[i].outputTokens)
  3. 总耗时 = Σ(concurrentState.results[i].totalTime)
  4. 吞吐量 = (总 Tokens / 总耗时) * 1000

调用:
  - UI.updateTotalRequests()
  - UI.updateTotalThroughput()
```

### 5.2 updateSummary() - 汇总统计

```javascript
// L396-428
updateSummary(results)
参数:
  - results: Concurrent.results 数组

计算逻辑:
  1. avgSpeed = Σ(speed) / count
  2. avgTtf = Σ(ttf) / 有效 count (过滤 null)
  3. avgTotalTime = Σ(totalTime) / count

DOM 更新:
  - avgTtf.textContent
  - avgSpeed.textContent
  - avgTotalTime.textContent
```

---

## 六、任务列表渲染

### 6.1 updateTaskList() - 完整列表渲染

```javascript
// L248-296
updateTaskList()

遍历 Concurrent.tasks[] 生成 HTML:

任务状态映射:
  pending   → class='',  text='等待中'
  running   → class='running', text='进行中'
  completed → class='completed', text='已完成'
  error     → class='error',   text='错误'
  aborted   → class='error',   text='已取消'

HTML 结构:
  <div class="concurrent-task-item {status}" id="task-{id}">
    <span class="task-id">#{id}</span>
    <span class="task-status">{statusText}</span>
    <span class="task-progress" id="task-progress-{id}">{tokens}</span>
  </div>
```

### 6.2 updateTaskProgress() - 进度实时更新

```javascript
// L301-306
updateTaskProgress(task)
参数:
  - task: { id, tokens }

DOM 操作:
  - 查找 #task-progress-{task.id}
  - 设置 innerHTML = '{tokens} tokens<span class="dots">...</span>'
```

### 6.3 updateTaskStatus() - 状态更新

```javascript
// L311-320
updateTaskStatus(task, status, message)
参数:
  - task: { id }
  - status: 'error' | 'aborted'
  - message: 错误信息

DOM 操作:
  - 查找 #task-{task.id}
  - 设置 class = `concurrent-task-item ${status}`
  - 更新 .task-status.textContent
```

### 6.4 updateTaskResult() - 完成结果更新

```javascript
// L325-330
updateTaskResult(task, result)
参数:
  - task: { id }
  - result: { outputTokens }

DOM 操作:
  - 查找 #task-progress-{task.id}
  - 设置 textContent = '{outputTokens} tokens'
```

---

## 七、结果表格渲染

### 7.1 addResultRow() - 添加结果行

```javascript
// L354-382
addResultRow(result)
参数:
  - result: { id, model, inputTokens, outputTokens, ttf, speed, totalTime }

HTML 结构:
  <tr>
    <td>{id.padStart(3,'0')}</td>
    <td>{model}</td>
    <td>{inputTokens}</td>
    <td>{outputTokens}</td>
    <td class="highlight-cell">{ttf || '-'}</td>
    <td class="highlight-cell">{speed.toFixed(2)} t/s</td>
    <td>{totalTime}ms</td>
    <td><span class="status-cell {success|error}">{✓|✗}</span></td>
  </tr>

插入策略:
  - insertBefore 第一行 (最新结果在最上)
  - 超出 maxTableRows 则删除最后一行
```

### 7.2 clearResultsTable() - 清空表格

```javascript
// L387-391
clearResultsTable()
DOM 操作:
  - resultsTableBody.innerHTML = ''
```

---

## 八、CSV 导出功能

### 8.1 exportToCsv() - 导出逻辑

```javascript
// L433-468
exportToCsv()

导出字段:
  ID, 模型，输入 Tokens, 输出 Tokens, TTFT(ms), 生成速度 (t/s), 总耗时 (ms), 时间

数据源:
  - Concurrent.getResults() → results 数组

文件名格式:
  - concurrent_test_results_{YYYY-MM-DD-HH-MM-SS}.csv

编码:
  - UTF-8 with BOM (\ufeff)
```

---

## 九、配置持久化

### 9.1 loadSavedConfig() - 加载保存配置

```javascript
// L484-520
loadSavedConfig()

读取顺序:
  1. apiType → apiTypeSelect.value
  2. apiUrl → apiUrl.value
  3. model → modelSelect.value
  4. prompt → promptInput.value
  5. concurrentCount → concurrentCount.value
  6. temperature → temperature.value

localStorage 键名 (来自 Config.storageKeys):
  - concurrent_test_api_type
  - concurrent_test_api_url
  - concurrent_test_model
  - concurrent_test_prompt
  - concurrent_test_concurrent_count
  - concurrent_test_temperature
```

---

## 十、UI 修改指南

| 修改需求 | 修改位置 | 注意事项 |
|------|------|------|
| 添加新按钮 | `index.html` 添加 HTML + `ui.js.bindEvents()` 添加监听 | 注意按钮顺序影响 tab 键导航 |
| 修改状态显示文案 | 搜索对应 `updateXxx()` 函数 | 保持文案简洁 |
| 新增指标卡片 | `index.html` 添加 HTML + `ui.js` 添加更新函数 | 使用 CSS Grid 自动布局 |
| 修改表格列 | `index.html:158-166` 表头 + `ui.js:360` 行内容 | 保持列顺序一致 |
| 调整导出字段 | `ui.js:440-450` CSV headers 和 rows | 注意转义特殊字符 |
| 修改状态徽章颜色 | `css/style.css` 对应 class | 使用 CSS Variables |
| 修改存储键名前缀 | `config.js:storageKeys` 统一修改 | 需兼容旧版本 localStorage |

---

## 十一、UI 模块调用关系图

```
用户操作
    │
    ▼
UI.bindEvents() ← 事件监听
    │
    ├── API 类型切换 → App.loadModels()
    ├── 刷新按钮 → App.loadModels()
    ├── 开始按钮 → App.startTest()
    ├── 停止按钮 → App.stopTest()
    ├── 清空按钮 → Concurrent.clear() + UI 重置函数族
    └── 导出按钮 → UI.exportToCsv()

Concurrent 模块回调 (单向调用)
    │
    ├── updateTaskList()
    ├── updateTaskProgress()
    ├── updateTaskStatus()
    ├── updateTaskResult()
    ├── updateConcurrentStatus()
    ├── updateMetrics()
    ├── addResultRow()
    └── updateSummary()
```
