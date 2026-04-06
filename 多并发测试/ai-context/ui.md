# UI 层文档

## 文件
- `js/ui.js` - UI 模块

## 模块职责
- DOM 元素缓存与初始化
- 事件绑定（按钮点击、输入变更）
- 界面状态更新（连接状态、测试状态、任务列表、结果表格）
- 指标显示（QPS、吞吐量、TTFT 等）
- CSV 导出功能

## 与其他模块的依赖关系
- **依赖**：`Config`（配置常量）
- **被依赖**：`App`、`Concurrent`（调用 UI 方法更新界面）
- **独立**：不直接依赖 `API` 模块

---

## 核心结构

### DOM 元素缓存（UI.elements）
```
connectionStatus      - 连接状态徽章
concurrentStatus      - 并发中徽章
apiTypeSelect         - API 类型下拉框（ollama/vllm）
apiUrl                - API 地址输入框
modelSelect           - 模型下拉框
refreshBtn            - 刷新模型按钮
promptInput           - 提示词输入框
concurrentCount       - 并发数输入框
temperature           - 温度参数输入框
startBtn              - 开始按钮
stopBtn               - 停止按钮
clearBtn              - 清空按钮
exportCsvBtn          - 导出 CSV 按钮
concurrentCountDisplay- 并发数显示
totalRequests         - 总请求数显示
qps                   - QPS 显示
totalThroughput       - 总吞吐量显示
avgTtf                - 平均 TTFT 显示
avgSpeed              - 平均速度显示
avgTotalTime          - 平均总耗时显示
concurrentTasksList   - 并发任务列表容器
resultsTableBody      - 结果表格 tbody
```

---

## 核心方法

### 初始化
- `init()` - 初始化 DOM 元素引用并绑定事件
- `loadSavedConfig()` - 从 localStorage 加载保存的配置

### 状态控制
- `setLoading(bool)` - 设置加载状态（禁用开始/刷新按钮）
- `setTesting(bool)` - 设置测试状态（控制按钮启用/禁用、显示并发中徽章）

### 状态显示更新
- `updateConnectionStatus(bool, string)` - 更新连接状态徽章
- `updateConcurrentStatus(number)` - 更新当前并发数显示
- `updateTotalRequests(number)` - 更新总请求数
- `updateQps(number)` - 更新 QPS 显示
- `updateTotalThroughput(number)` - 更新总吞吐量

### 任务列表更新
- `updateTaskList()` - 渲染所有任务状态
- `updateTaskProgress(task)` - 更新单个任务的 token 进度
- `updateTaskStatus(task, status, message)` - 更新任务状态（error/aborted）
- `updateTaskResult(task, result)` - 更新任务完成结果
- `clearTaskList()` - 清空任务列表

### 结果表格
- `addResultRow(result)` - 添加一行结果到表格（插入到第一行）
- `clearResultsTable()` - 清空结果表格
- `updateMetrics(concurrentState)` - 更新指标（总请求数、吞吐量）
- `updateSummary(results)` - 更新汇总统计（平均 TTFT、速度、总耗时）

### 导出功能
- `exportToCsv()` - 导出当前结果为 CSV 文件

### 工具方法
- `formatTime(timestamp)` - 格式化时间为 HH:mm:ss

---

## 事件绑定（bindEvents）

| 事件 | 触发操作 |
|------|----------|
| apiTypeSelect change | 保存类型 → 更新默认地址 → 刷新模型列表 |
| apiUrl change | 保存地址到 localStorage |
| modelSelect change | 保存模型到 localStorage |
| promptInput change | 保存提示词到 localStorage |
| concurrentCount change | 校验范围后保存 |
| temperature change | 保存温度参数 |
| refreshBtn click | 调用 `App.loadModels()` |
| startBtn click | 调用 `App.startTest()` |
| stopBtn click | 调用 `App.stopTest()` |
| clearBtn click | 确认 → 清空 `Concurrent`、表格、任务列表、指标 |
| exportCsvBtn click | 调用 `exportToCsv()` |

---

## 修改指引

| 问题类型 | 查看位置 |
|----------|----------|
| UI 元素不显示 | `init()` 中的 `getElementById` |
| 点击事件无效 | `bindEvents()` 中的事件监听器 |
| 样式问题 | `index.html` 或 `css/style.css` |
| 数据未更新到界面 | 对应 `update*` 方法 |
| 表格排序问题 | `addResultRow()` 中的 `insertBefore` |
