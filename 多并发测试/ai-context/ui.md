# UI 文档

## 文件
- `js/ui.js` - UI 模块

## 模块职责
- 缓存 DOM 元素并完成初始化
- 绑定表单、按钮和测试流程相关事件
- 更新连接状态、并发状态、任务列表和统计指标
- 从 `localStorage` 恢复已保存配置
- 支持结果导出

## DOM 元素
```text
connectionStatus       - 连接状态徽章
concurrentStatus       - 并发状态徽章
apiTypeSelect          - API 类型选择框
apiUrl                 - API 地址输入框
apiKey                 - 可选 API Key 输入框
modelSelect            - 模型选择框
refreshBtn             - 刷新模型按钮
promptInput            - 提示词输入框
concurrentCount        - 并发数输入框
temperature            - 温度输入框
startBtn               - 开始按钮
stopBtn                - 停止按钮
clearBtn               - 清空按钮
exportCsvBtn           - 导出 CSV 按钮
concurrentCountDisplay - 当前并发显示
totalRequests          - 总请求数显示
qps                    - QPS 显示
totalThroughput        - 总吞吐量显示
avgTtf                 - 平均 TTFT 显示
avgSpeed               - 平均速度显示
avgTotalTime           - 平均总耗时显示
concurrentTasksList    - 任务列表容器
resultsTableBody       - 结果表格 tbody
```

## 关键行为
- `init()`：初始化 DOM 引用并绑定事件。
- `bindEvents()`：保存 API 类型、API 地址、API Key、模型、提示词和测试参数。
- `loadSavedConfig()`：优先恢复已保存的 `apiUrl` 和可选 `apiKey`，没有时再使用当前 API 类型的默认地址。
- `setLoading()` / `setTesting()`：控制按钮与表单可用状态。
- `updateTaskList()`、`updateTaskProgress()`、`updateTaskStatus()`：维护并发任务显示。
- `updateMetrics()`、`updateSummary()`：更新统计指标。

## 事件
| 事件 | 行为 |
|------|------|
| `apiTypeSelect change` | 保存类型、切换默认地址并刷新模型列表 |
| `apiUrl change` | 保存 API 地址 |
| `apiKey input` | 实时保存可选 API Key |
| `modelSelect change` | 保存模型 |
| `promptInput change` | 保存提示词 |
| `concurrentCount change` | 校验范围并保存 |
| `temperature change` | 保存温度 |
| `refreshBtn click` | 重新加载模型 |
| `startBtn click` | 启动测试 |
| `stopBtn click` | 停止测试 |
| `clearBtn click` | 清空任务、结果和指标 |
| `exportCsvBtn click` | 导出当前结果 |
