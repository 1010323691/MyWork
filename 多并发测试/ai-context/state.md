# 状态管理模块说明

---

## 状态总览

项目使用**全局对象** + **localStorage** 进行状态管理，无框架状态管理。

---

## 全局状态对象

### 1. `Config` (`js/config.js`)

**常量配置，不可修改**:

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
    storageKeys: { ... },  // localStorage 键名
    uiUpdateInterval: 100,
    maxTableRows: 100,
    qpsWindow: 1,
    decimalPrecision: 2
}
```

### 2. `Concurrent` (`js/concurrent.js`)

**并发测试运行时状态**:

```javascript
Concurrent = {
    isRunning: false,           // 是否正在运行
    abortController: null,      // 用于停止请求
    
    // 任务管理
    tasks: [],                  // 任务数组 [{ id, status, result }]
    pendingCount: 0,            // 待处理数
    runningCount: 0,            // 运行中数
    completedCount: 0,          // 已完成数
    totalCount: 0,              // 总数
    
    // 结果存储
    results: [],               // 结果数组
    
    // QPS 统计
    requestTimestamps: [],      // 请求时间戳
    lastQpsCalc: 0,
    currentQps: 0,
    qpsTimer: null
}
```

### 3. `UI` (`js/ui.js`)

**UI 状态，通过 DOM 反映**:

```javascript
UI = {
    elements: {}  // DOM 元素缓存
}
```

### 4. `App` (`js/main.js`)

**业务协调器，无持久状态**

---

## localStorage 状态

**键名定义** (`Config.storageKeys`):

| 键名 | 存储内容 | 默认值来源 |
|------|--------|-----------|
| `concurrent_test_api_type` | API 类型 (vllm/ollama) | `Config.defaultApiType` |
| `concurrent_test_api_url` | API 地址 | `Config.defaultVllmUrl` / `Config.defaultApiUrl` |
| `concurrent_test_model` | 选中模型 | 无 |
| `concurrent_test_prompt` | 测试提示词 | 无 |
| `concurrent_test_concurrent_count` | 并发数 | `Config.defaultConcurrentCount` |
| `concurrent_test_temperature` | Temperature | `Config.defaultTemperature` |

**读取位置**: `UI.loadSavedConfig()`

**写入时机**:
- API 类型/地址/模型/提示词/并发数/temperature 变更时 (change 事件)

---

## 数据流动

### 初始化流程

```
页面加载
  ↓
config.js → Config 对象就绪
  ↓
api.js → API 对象就绪 (依赖 Config)
  ↓
concurrent.js → Concurrent 对象就绪 (依赖 API)
  ↓
ui.js → UI 对象就绪 (缓存 DOM)
  ↓
main.js → App.init()
  ↓
UI.loadSavedConfig() → 从 localStorage 恢复配置
  ↓
App.checkConnection() → 检查连接
  ↓
App.loadModels() → 加载模型列表
```

### 测试执行流程

```
用户点击开始按钮
  ↓
UI.bindEvents → App.startTest()
  ↓
App.validateInput() → 验证输入
  ↓
App.getTestConfig() → 获取配置
  ↓
Concurrent.initialize(count) → 初始化任务队列
  ↓
UI.setTesting(true) → 更新 UI 状态
  ↓
Concurrent.runAll(config)
  ↓
并发执行 runRequest(taskId, config)
  ↓
API.chat(prompt, model, temperature, controller)
  ↓
API.parseStream(stream, onToken, onComplete)
  ↓
流式回调 → UI 实时更新
  ↓
完成回调 → 更新 Concurrent.results
  ↓
UI.addResultRow(result) → 添加结果行
  ↓
UI.updateSummary(results) → 更新统计
```

---

## 任务状态流转

```
pending (待处理)
  ↓ (runRequest 开始)
running (运行中)
  ↓ (请求成功)
completed (已完成)
  ↓
[加入 Concurrent.results]

或者:

running
  ↓ (用户点击停止)
aborted (已取消)

或者:

running
  ↓ (请求失败)
error (错误)
```

---

## 状态同步点

| 状态变更 | 同步位置 |
|--------|--------|
| 用户修改配置 | UI → localStorage |
| 测试开始 | App → Concurrent → UI |
| 任务状态变更 | Concurrent → UI |
| 请求完成 | API → Concurrent → UI |
| 测试结束 | Concurrent → UI (summary) |

---

## 修改指引

| 修改场景 | 修改位置 |
|--------|--------|
| 新增配置项 | `config.js` 添加常量 → `ui.js:loadSavedConfig()` 读取 |
| 新增状态字段 | `concurrent.js` 对应对象 → 初始化位置同步添加 |
| 修改存储键名 | `config.js:storageKeys` |
| 修改默认值 | `config.js` 对应 `default*` 字段 |
