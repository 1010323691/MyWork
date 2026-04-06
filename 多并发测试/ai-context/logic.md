# 业务逻辑文档

## 文件
- `js/main.js` - App 对象

## 模块职责
- 应用初始化流程控制
- 连接检查与模型加载
- 测试启动与停止的业务逻辑
- 输入验证与配置提取

## 与其他模块的依赖关系
- **依赖**：`UI`、`API`、`Concurrent`、`Config`
- **被依赖**：`UI`（事件绑定时调用）
- **角色**：业务协调层，连接 UI 层与底层模块

---

## 核心方法

### 初始化
- `init()` - 应用初始化主流程：
  1. `UI.init()` - 初始化 UI
  2. `UI.loadSavedConfig()` - 加载保存的配置
  3. `checkConnection()` - 检查连接
  4. `loadModels()` - 加载模型列表

### 连接与模型
- `checkConnection()` - 检查 API 连接，调用 `API.checkConnection()`
- `loadModels()` - 加载模型列表：
  - 调用 `API.getModels()`
  - 填充 `UI.elements.modelSelect`
  - 恢复上次选择的模型

### 测试控制
- `startTest()` - 开始测试：
  1. `validateInput()` - 验证输入
  2. `getTestConfig()` - 获取配置
  3. `Concurrent.initialize()` - 初始化并发模块
  4. `UI.setTesting(true)` - 更新 UI 状态
  5. `Concurrent.runAll()` - 启动并发测试

- `stopTest()` - 停止测试：
  1. 用户确认
  2. `Concurrent.stop()` - 停止并发模块
  3. `UI.setTesting(false)` - 重置 UI 状态

### 输入验证
- `validateInput()` - 验证输入：
  - 模型是否选择
  - 提示词是否为空
  - 并发数是否在 1-100 范围内

### 配置提取
- `getTestConfig()` - 提取测试配置：
  - `apiUrl` - 来自 UI 或默认值
  - `apiType` - 来自 UI 或默认值
  - `model` - 用户选择
  - `prompt` - 用户输入
  - `concurrentCount` - 用户输入
  - `temperature` - 用户输入

---

## 调用链（用户点击开始按钮）

```
UI.startBtn click
  → App.startTest()
      → validateInput()（验证输入）
      → getTestConfig()（提取配置）
      → Concurrent.initialize(count)（初始化任务队列）
      → UI.setTesting(true)（禁用按钮）
      → UI.clearResultsTable()（清空表格）
      → UI.resetMetrics()（重置指标）
      → UI.updateTaskList()（显示任务列表）
      → Concurrent.runAll(config)（启动并发测试）
          → Concurrent.startQpsCalc()（启动 QPS 定时器）
          → Promise.allSettled(tasks.map(runRequest))（并发执行）
              → API.chat()（发送请求）
              → API.parseStream()（解析流式响应）
                  → onToken 回调 → UI.updateTaskProgress()
                  → onComplete 回调 → UI.addResultRow() + UI.updateMetrics()
```

---

## 修改指引

| 问题类型 | 查看位置 |
|----------|----------|
| 应用不初始化 | `init()`、`DOMContentLoaded` |
| 模型加载失败 | `loadModels()` |
| 测试无法启动 | `startTest()`、`validateInput()` |
| 停止测试无效 | `stopTest()` |
| 验证规则修改 | `validateInput()` |
| 配置项新增 | `getTestConfig()` |
