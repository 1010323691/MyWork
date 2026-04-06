# 风险点与注意事项

---

## 易错区域

### 1. UI 与状态不同步

**问题**: UI 更新与 Concurrent 状态不一致

**常见场景**:
- 测试中途停止，Concurrent.isRunning 未重置
- 任务计数错误 (runningCount/completedCount)

**位置**:
- `concurrent.js:runAll()` - 必须确保 finally 或 catch 中更新计数
- `ui.js:setTesting()` - 测试结束时必须调用

**修复原则**:
```javascript
// 任何时候修改计数，都要同步更新 UI
this.runningCount--;
UI.updateConcurrentStatus(this.runningCount);
```

---

### 2. AbortController 管理

**问题**: 停止测试时请求未被正确取消

**常见场景**:
- Concurrent.abortController 未正确传递到 API.chat()
- 每个请求的独立 controller 未被 abort

**位置**:
- `concurrent.js:stop()` - 必须 abort 全局 controller
- `concurrent.js:runRequest()` - 每个请求需要独立 controller

**修复原则**:
```javascript
// 停止时 abort 所有请求
stop() {
    this.isRunning = false;
    if (this.abortController) {
        this.abortController.abort();
    }
}
```

---

### 3. 流式响应解析

**问题**: token 统计不准确或内存泄漏

**常见场景**:
- vLLM 的 usage 只在最后一个 chunk，中间需要估算
- Ollama 的 eval_count 在 done=true 时返回
- stream 未完整读取就中断

**位置**:
- `api.js:parseStream()` - 两个 API 类型的解析逻辑

**修复原则**:
```javascript
// 兜底 token 数
const visibleTokens = outputTokens > 0 ? outputTokens : accumulatedContent.length;
```

---

### 4. localStorage 与 UI 不同步

**问题**: 修改配置后未保存，刷新后丢失

**常见场景**:
- 新增输入框未绑定 change 事件
- API 类型切换后未更新默认地址

**位置**:
- `ui.js:bindEvents()` - 所有输入框必须有 change 事件
- `ui.js:loadSavedConfig()` - 加载逻辑与保存逻辑对应

**修复原则**:
```javascript
// 每次 change 事件必须保存
this.elements.xyz.addEventListener('change', () => {
    localStorage.setItem(Config.storageKeys.xyz, this.elements.xyz.value);
});
```

---

### 5. DOM 元素不存在

**问题**: 访问未初始化的 UI.elements 导致报错

**常见场景**:
- init() 之前调用 UI 方法
- HTML 元素 ID 变更未同步更新

**位置**:
- `ui.js` 所有更新方法 - 必须检查元素存在性

**修复原则**:
```javascript
// 所有 UI 方法必须有空值检查
updateConnectionStatus(isConnected, message) {
    if (!this.elements.connectionStatus) return;
    // ...
}
```

---

## 强耦合区域

### 1. UI 与 Concurrent 强耦合

**表现**: UI 模块直接访问 Concurrent 内部状态

**位置**:
- `ui.js:updateTaskList()` - 访问 `Concurrent.tasks`
- `ui.js:exportToCsv()` - 访问 `Concurrent.getResults()`
- `ui.js:updateMetrics()` - 访问 `concurrentState.results`

**风险**: 修改 Concurrent 数据结构需要同步修改 UI

### 2. Concurrent 与 UI 强耦合

**表现**: Concurrent 模块直接调用 UI 方法

**位置**:
- `concurrent.js:runRequest()` - 调用多个 UI 更新方法
- `concurrent.js:runAll()` - 调用 UI.setTesting()

**风险**: UI 框架切换时 Concurrent 需要大量修改

### 3. API 与 Config 强耦合

**表现**: API 模块直接使用 Config 常量

**位置**:
- `api.js:getApiUrl()` - 使用 Config 默认地址
- `api.js:chat()` - 使用 Config.apiTypes

**风险**: 修改配置结构影响 API 逻辑

---

## 修改时需特别小心

### 修改并发逻辑

**文件**: `concurrent.js:runAll()`

**风险**: 
- 并发数与实际请求数不一致
- 任务状态错误
- QPS 计算错误

**建议**:
1. 确保 `Promise.allSettled` 包裹所有请求
2. 确保每个请求的计数增减匹配
3. 测试不同并发数 (1, 10, 50, 100)

---

### 修改流式解析

**文件**: `api.js:parseStream()`

**风险**:
- 内存泄漏 (stream 未读完)
- token 统计错误
- TTFT 计算错误

**建议**:
1. 确保 while(true) 循环正确结束
2. 确保 onComplete 只调用一次
3. 验证两个 API 类型的响应格式

---

### 修改 UI 状态控制

**文件**: `ui.js:setTesting()`

**风险**:
- 按钮状态混乱
- 用户在测试中修改配置
- 测试结束后无法重新开始

**建议**:
1. 确保测试开始时禁用所有配置输入
2. 确保测试结束时恢复所有状态
3. 验证 stopBtn 的启用/禁用逻辑

---

### 修改 localStorage 键名

**文件**: `config.js:storageKeys`

**风险**:
- 已有用户配置丢失
- 新旧键名冲突

**建议**:
1. 修改后清理浏览器 localStorage 测试
2. 考虑向后兼容 (读取旧键名迁移)

---

### 修改验证逻辑

**文件**: `main.js:validateInput()`

**风险**:
- 允许非法值传入
- 用户无提示提交失败

**建议**:
1. 每个验证必须有明确错误提示
2. 验证并发数边界 (1-100)
3. 验证必填字段非空

---

## 调试建议

### 查看任务状态

```javascript
console.log('Tasks:', Concurrent.tasks);
console.log('Counts:', {
    pending: Concurrent.pendingCount,
    running: Concurrent.runningCount,
    completed: Concurrent.completedCount
});
```

### 查看 API 请求

```javascript
// 在 api.js:chat() 开头添加
console.log('[API] Request:', {
    url: `${this.getApiUrl()}/...`,
    body: { model, prompt: prompt.substring(0, 50) + '...' }
});
```

### 查看流式响应

```javascript
// 在 api.js:parseStream() 的 onToken 回调中添加
console.log('[Token]', content.substring(0, 100));
```

---

## 测试检查清单

修改后必须验证:

- [ ] 单个请求正常工作 (并发数=1)
- [ ] 多个并发正常工作 (并发数=10)
- [ ] 停止测试功能正常
- [ ] 清空结果功能正常
- [ ] 配置修改后保存正确
- [ ] 刷新页面配置恢复
- [ ] vLLM API 正常工作
- [ ] Ollama API 正常工作
- [ ] 模型切换后正常请求
- [ ] 导出 CSV 功能正常
