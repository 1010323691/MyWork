# 业务逻辑模块说明

---

## 文件清单

| 文件 | 职责 |
|------|------|
| `js/main.js` | 主入口模块 (`App` 对象) |
| `js/concurrent.js` | 并发测试模块 (`Concurrent` 对象) |

---

## App 对象 (`js/main.js`)

**职责**: 业务协调器，连接 UI 与核心逻辑

### 方法列表

```javascript
App = {
    init(),              // 初始化应用
    checkConnection(),   // 检查连接
    loadModels(),        // 加载模型列表
    startTest(),         // 开始测试
    stopTest(),          // 停止测试
    validateInput(),     // 验证输入
    getTestConfig()      // 获取测试配置
}
```

### init() - 初始化流程

```javascript
async init() {
    UI.init();                    // 初始化 DOM 缓存
    UI.loadSavedConfig();         // 加载保存的配置
    await this.checkConnection(); // 检查连接
    await this.loadModels();      // 加载模型列表
}
```

### validateInput() - 输入验证

**验证规则**:

1. 模型必须选择 (modelSelect.value 非空)
2. 提示词不能为空 (promptInput.value.trim())
3. 并发数范围：1-100

**失败行为**: alert 提示，返回 false

### getTestConfig() - 获取配置

**返回对象**:

```javascript
{
    apiUrl: string,           // 来自 UI.elements.apiUrl
    apiType: string,          // vllm/ollama
    model: string,            // 选中的模型
    prompt: string,           // 用户输入的提示词
    concurrentCount: number,  // 并发数
    temperature: number       // Temperature
}
```

### startTest() - 开始测试

**流程**:

1. `validateInput()` → 验证输入
2. `getTestConfig()` → 获取配置
3. `Concurrent.initialize(count)` → 初始化任务队列
4. `UI.setTesting(true)` → 更新 UI 状态
5. `UI.clearResultsTable()` → 清空表格
6. `UI.resetMetrics()` → 重置指标
7. `UI.updateTaskList()` → 更新任务列表
8. `Concurrent.runAll(config)` → 开始并发测试

### stopTest() - 停止测试

**流程**:

1. 确认对话框
2. `Concurrent.stop()` → 停止所有请求
3. `UI.setTesting(false)` → 重置 UI 状态

---

## Concurrent 对象 (`js/concurrent.js`)

**职责**: 并发测试核心逻辑

### 方法列表

```javascript
Concurrent = {
    initialize(concurrentCount),  // 初始化测试
    stop(),                       // 停止测试
    clear(),                      // 清空结果
    checkAllCompleted(),          // 检查是否全部完成
    runRequest(id, config),       // 运行单次请求
    runAll(config),               // 运行所有请求
    startQpsCalc(),               // 启动 QPS 计算
    stopQpsCalc(),                // 停止 QPS 计算
    getResults()                  // 获取测试结果
}
```

### initialize(count) - 初始化

**操作**:

1. 重置状态变量 (isRunning, tasks, counts, results)
2. 创建 AbortController
3. 创建任务队列：`[{ id: 1, status: 'pending' }, ...]`

### runAll(config) - 运行所有请求

**流程**:

```javascript
async runAll(config) {
    // 1. 重置计数
    this.totalCount = this.tasks.length;
    this.completedCount = 0;
    this.runningCount = 0;
    
    // 2. 启动 QPS 计算
    this.startQpsCalc();
    
    // 3. 同时启动所有请求 (真正的并发)
    const promises = this.tasks.map(task => 
        this.runRequest(task.id, config)
    );
    
    // 4. 等待所有请求完成 (成功或失败)
    await Promise.allSettled(promises);
    
    // 5. 清理
    this.stopQpsCalc();
    this.isRunning = false;
    UI.setTesting(false);
}
```

**关键点**: 使用 `Promise.allSettled` 确保所有请求同时启动，不等待前一个完成

### runRequest(id, config) - 单次请求

**流程**:

```javascript
async runRequest(id, config) {
    // 1. 更新任务状态为 running
    task.status = 'running';
    this.runningCount++;
    
    // 2. 发送 API 请求 (流式)
    const stream = await API.chat(prompt, model, temperature, controller);
    
    // 3. 解析流式响应
    await API.parseStream(stream,
        onToken: (content, tokens, type) => {
            // 实时更新任务进度
            UI.updateTaskProgress(task);
        },
        onComplete: (stats) => {
            // 请求完成
            this.completedCount++;
            this.runningCount--;
            this.results.push(result);
            UI.addResultRow(result);
        }
    );
    
    // 4. 异常处理
    catch (error) {
        if (error.name === 'AbortError') {
            task.status = 'aborted';
        } else {
            task.status = 'error';
        }
    }
}
```

### QPS 计算

**逻辑**:

```javascript
startQpsCalc() {
    const calcQps = () => {
        const now = Date.now();
        const windowMs = Config.qpsWindow * 1000;
        
        // 过滤窗口外的时间戳
        this.requestTimestamps = this.requestTimestamps.filter(
            ts => now - ts <= windowMs
        );
        
        // 计算 QPS
        this.currentQps = this.requestTimestamps.length / Config.qpsWindow;
        
        // 更新 UI
        UI.updateQps(this.currentQps);
    };
    
    this.qpsTimer = setInterval(calcQps, Config.uiUpdateInterval / 2);
}
```

---

## 调用链 (完整流程)

### 用户点击开始按钮

```
1. index.html:108-110
   UI.elements.startBtn.addEventListener → App.startTest()
   
2. js/main.js:101-120
   App.startTest()
     → validateInput()
     → getTestConfig()
     → Concurrent.initialize()
     → UI.setTesting(true)
     → Concurrent.runAll()
   
3. js/concurrent.js:186-218
   Concurrent.runAll(config)
     → startQpsCalc()
     → Promise.allSettled(tasks.map(runRequest))
   
4. js/concurrent.js:86-180
   Concurrent.runRequest(id, config)
     → API.chat()
     → API.parseStream()
   
5. js/api.js:104-325
   API.chat() → fetch(...)
   API.parseStream() → 解析 SSE 流
   
6. js/ui.js (回调)
   UI.updateTaskProgress()
   UI.addResultRow()
   UI.updateMetrics()
   UI.updateSummary()
```

---

## 修改指引

| 修改场景 | 修改位置 |
|--------|--------|
| 修改验证规则 | `main.js:validateInput()` |
| 新增配置项 | `main.js:getTestConfig()` 添加字段 |
| 修改并发逻辑 | `concurrent.js:runAll()` |
| 修改任务状态流转 | `concurrent.js:runRequest()` |
| 修改 QPS 计算窗口 | `config.js:qpsWindow` |
| 修改初始化流程 | `main.js:init()` |
