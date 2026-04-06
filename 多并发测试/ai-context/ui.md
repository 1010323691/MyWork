# UI 层模块说明

---

## 文件清单

| 文件 | 职责 |
|------|------|
| `index.html` | 页面结构定义 |
| `css/style.css` | 全部样式定义 |
| `js/ui.js` | UI 渲染模块 (`UI` 对象) |

---

## UI 模块结构 (`js/ui.js`)

### 核心对象

```
UI = {
    elements: {},           // DOM 元素缓存
    init(),                // 初始化 DOM 引用
    bindEvents(),          // 绑定事件监听器
    // 状态更新
    updateConnectionStatus(),
    setLoading(),
    setTesting(),
    // 指标更新
    updateConcurrentStatus(),
    updateTotalRequests(),
    updateQps(),
    updateTotalThroughput(),
    updateMetrics(),
    // 任务列表
    updateTaskList(),
    updateTaskProgress(),
    updateTaskStatus(),
    updateTaskResult(),
    clearTaskList(),
    // 结果表格
    addResultRow(),
    clearResultsTable(),
    updateSummary(),
    // 工具函数
    exportToCsv(),
    formatTime(),
    loadSavedConfig(),
    resetMetrics()
}
```

---

## DOM 元素映射 (`UI.elements`)

| 元素 ID | 用途 | 对应变量 |
|--------|------|--------|
| `connectionStatus` | 连接状态徽章 | `UI.elements.connectionStatus` |
| `concurrentStatus` | 并发中状态徽章 | `UI.elements.concurrentStatus` |
| `apiTypeSelect` | API 类型选择器 | `UI.elements.apiTypeSelect` |
| `apiUrl` | API 地址输入框 | `UI.elements.apiUrl` |
| `modelSelect` | 模型选择器 | `UI.elements.modelSelect` |
| `refreshBtn` | 刷新模型按钮 | `UI.elements.refreshBtn` |
| `promptInput` | 提示词输入框 | `UI.elements.promptInput` |
| `concurrentCount` | 并发数输入框 | `UI.elements.concurrentCount` |
| `temperature` | Temperature 输入框 | `UI.elements.temperature` |
| `startBtn` | 开始测试按钮 | `UI.elements.startBtn` |
| `stopBtn` | 停止测试按钮 | `UI.elements.stopBtn` |
| `clearBtn` | 清空结果按钮 | `UI.elements.clearBtn` |
| `exportCsvBtn` | 导出 CSV 按钮 | `UI.elements.exportCsvBtn` |
| `concurrentCountDisplay` | 并发数显示 | `UI.elements.concurrentCountDisplay` |
| `totalRequests` | 总请求数显示 | `UI.elements.totalRequests` |
| `qps` | QPS 显示 | `UI.elements.qps` |
| `totalThroughput` | 总吞吐量显示 | `UI.elements.totalThroughput` |
| `avgTtf` | 平均 TTFT 显示 | `UI.elements.avgTtf` |
| `avgSpeed` | 平均速度显示 | `UI.elements.avgSpeed` |
| `avgTotalTime` | 平均总耗时显示 | `UI.elements.avgTotalTime` |
| `concurrentTasksList` | 任务列表容器 | `UI.elements.concurrentTasksList` |
| `resultsTableBody` | 结果表格 body | `UI.elements.resultsTableBody` |

---

## 事件绑定 (`bindEvents()`)

| 事件 | 触发元素 | 处理逻辑 |
|------|--------|--------|
| `change` | `apiTypeSelect` | 保存 apiType → 更新默认地址 → 刷新模型列表 |
| `change` | `apiUrl` | 保存 apiUrl 到 localStorage |
| `change` | `modelSelect` | 保存 model 到 localStorage |
| `change` | `promptInput` | 保存 prompt 到 localStorage |
| `change` | `concurrentCount` | 边界限制 (1-100) → 保存 |
| `change` | `temperature` | 保存到 localStorage |
| `click` | `refreshBtn` | 调用 `App.loadModels()` |
| `click` | `startBtn` | 调用 `App.startTest()` |
| `click` | `stopBtn` | 调用 `App.stopTest()` |
| `click` | `clearBtn` | 确认对话框 → 清空结果 |
| `click` | `exportCsvBtn` | 调用 `exportToCsv()` |

---

## 核心 UI 更新函数

### 状态控制

- `setTesting(isTesting)` - 测试中禁用/启用按钮
  - 禁用：startBtn, modelSelect, refreshBtn, concurrentCount
  - 启用：stopBtn
  - 控制并发中徽章显示

### 指标更新

- `updateMetrics(concurrentState)` - 基于 Concurrent 状态更新指标
- `updateSummary(results)` - 计算并更新平均值指标

### 任务列表

- `updateTaskList()` - 渲染所有任务状态
- `updateTaskProgress(task)` - 更新单个任务进度
- `updateTaskStatus(task, status, message)` - 更新任务状态样式

### 结果表格

- `addResultRow(result)` - 添加结果行到表格顶部
- `clearResultsTable()` - 清空表格
- 限制最大行数：`Config.maxTableRows` (100 行)

---

## 样式类名 (`css/style.css`)

| 类名 | 用途 |
|------|------|
| `.status-badge.connected` | 连接成功状态 |
| `.status-badge.error` | 错误状态 |
| `.status-badge.active` | 并发中状态 |
| `.status-badge.hidden` | 隐藏状态 |
| `.concurrent-task-item.running` | 任务进行中 |
| `.concurrent-task-item.completed` | 任务完成 |
| `.concurrent-task-item.error` | 任务错误 |
| `.metric-card.highlight` | 高亮指标卡片 |
| `.btn-primary/secondary/danger/outline` | 按钮样式 |

---

## 修改指引

| 修改场景 | 修改位置 |
|--------|--------|
| 新增输入框 | `index.html` 添加元素 → `ui.js:init()` 缓存 → `bindEvents()` 绑定事件 |
| 修改按钮行为 | `ui.js:bindEvents()` 对应事件处理器 |
| 修改表格列 | `index.html:results-table` 表头 → `ui.js:addResultRow()` 行内容 |
| 修改样式 | `css/style.css` 对应类名 |
| 修改本地存储键名 | `config.js:storageKeys` |
