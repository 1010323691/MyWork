# 风险点分析

> 识别代码中的潜在问题、耦合点和需要特别注意的区域

---

## 一、全局变量污染风险

### 1.1 问题描述

```javascript
// 所有模块都暴露到全局
window.App = App;        // main.js:174
window.Concurrent = Concurrent;  // concurrent.js:268
window.API = API;        // api.js:329
window.UI = UI;          // ui.js:524
window.Config = Config;  // config.js:51
```

**风险**: 
- 全局命名空间污染
- 外部脚本可能覆盖这些变量
- 变量名冲突难以调试

**影响范围**: 整个项目

**缓解措施**:
- 当前是单文件项目，风险可控
- 如需扩展，建议改用 ES6 模块 + Webpack/Vite 打包

---

## 二、模块间强耦合

### 2.1 Concurrent ↔ UI 双向依赖

```javascript
// concurrent.js 直接调用 UI
UI.updateTaskList();      // L94, L152
UI.updateTaskProgress();  // L124
UI.addResultRow();        // L154
UI.updateMetrics();       // L156
UI.updateSummary();       // L159

// UI 直接调用 App
App.loadModels();         // ui.js:69, L104
App.startTest();          // ui.js:109
App.stopTest();           // ui.js:114
```

**风险**:
- Concurrent 模块依赖 UI，无法独立测试
- UI 模块依赖 App，形成循环依赖链
- 修改一个模块可能意外影响其他模块

**调用链**:
```
App → Concurrent → UI → App (循环)
```

**影响范围**: 重构难度高，单元测试困难

**缓解措施**:
- 引入回调函数接口解耦
- 使用事件系统替代直接调用
- 定义清晰的接口契约

### 2.2 API ↔ Config 单向依赖

```javascript
// api.js 直接使用 Config
Config.apiTypes.VLLM      // L38, L71, L119, L208
Config.apiTypes.OLLAMA    // L57, L172
Config.defaultApiUrl      // 通过 getApiUrl 间接使用
```

**风险**: 
- Config 修改需要同步更新 API 模块

**影响范围**: 中等

**缓解措施**:
- Config 作为常量定义，修改频率低
- 风险可控

---

## 三、状态同步风险

### 3.1 localStorage 与 UI 状态可能不同步

```javascript
// ui.js 保存配置
localStorage.setItem(Config.storageKeys.xxx, value);

// ui.js 加载配置 (仅页面初始化时)
loadSavedConfig() {
  const savedValue = localStorage.getItem(...);
  this.elements.xxx.value = savedValue;
}
```

**风险场景**:
```
用户 A 在标签页 1 修改配置 → localStorage 更新
用户 B 在标签页 2 (已加载) → UI 状态仍为旧值
```

**影响范围**: 
- 多标签页操作时状态不一致
- 用户可能困惑

**缓解措施**:
- 监听 `storage` 事件同步跨标签页
- 添加 "同步配置" 按钮手动刷新

### 3.2 页面刷新丢失运行时状态

```javascript
// 运行时状态不持久化
Concurrent.tasks[]    // 刷新后丢失
Concurrent.results[]  // 刷新后丢失
```

**风险场景**:
```
用户进行并发测试 → 误刷新页面 → 所有结果丢失
```

**影响范围**: 
- 用户数据可能丢失
- 测试需要重新开始

**缓解措施**:
- 添加 "保存结果" 功能
- 页面卸载前提示用户
- 考虑将 results 持久化到 localStorage

---

## 四、并发控制风险

### 4.1 无限制并发可能导致问题

```javascript
// concurrent.js:201-204
const promises = this.tasks.map(task => {
    this.pendingCount--;
    return this.runRequest(task.id, config);
});
await Promise.allSettled(promises);
```

**风险场景**:
```
并发数设置为 100 → 同时发送 100 个请求
→ 浏览器网络连接限制 (通常 6-8 个/域名)
→ 请求排队等待
→ 服务器可能被压垮
```

**影响范围**:
- 浏览器性能下降
- 服务器可能被拒绝服务
- QPS 统计不准确 (实际并发低于设定值)

**缓解措施**:
```javascript
// 建议实现限流队列
async runAllWithLimit(config, limit = 10) {
  const queue = [...this.tasks];
  const running = new Set();
  
  while (queue.length > 0 || running.size > 0) {
    while (running.size < limit && queue.length > 0) {
      const task = queue.shift();
      const promise = this.runRequest(task.id, config);
      running.add(promise);
      promise.then(() => running.delete(promise));
    }
    await Promise.race(running);
  }
  await Promise.allSettled(running);
}
```

### 4.2 停止机制可能无法中断所有请求

```javascript
// concurrent.js:53-59
stop() {
    this.isRunning = false;
    if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
    }
}
```

**风险场景**:
```
AbortController 在 initialize() 创建 (L29)
但每个 runRequest() 也创建独立的 AbortController (L104)
stop() 只 abort 全局的，不影响单个请求的 controller
```

**代码分析**:
```javascript
// concurrent.js:27-29
initialize(concurrentCount) {
    // ...
    this.abortController = new AbortController();
    // ...
}

// concurrent.js:88-104
async runRequest(id, config) {
    // ...
    const controller = new AbortController();  // 独立 controller!
    
    const stream = await API.chat(
        config.prompt,
        config.model,
        config.temperature,
        controller  // 传递的是独立的 controller
    );
    // ...
}
```

**影响范围**:
- "停止测试" 可能无法立即停止所有请求
- 请求会继续直到完成或超时

**缓解措施**:
```javascript
// 修改 runRequest 使用共享的 abortController
async runRequest(id, config) {
    // 使用共享的 abortController
    const stream = await API.chat(
        config.prompt,
        config.model,
        config.temperature,
        this.abortController  // 共享 controller
    );
    // ...
}
```

---

## 五、错误处理风险

### 5.1 流式响应解析无边界检查

```javascript
// api.js:202-217
while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    // 解析 chunk...
}
```

**风险场景**:
```
服务器返回异常数据 → JSON.parse 失败
→ 单个 chunk 解析失败被 try-catch 忽略
→ accumulatedContent 可能不完整
→ onComplete 被调用但数据不完整
```

**影响范围**:
- 测试结果可能不准确
- 用户体验下降

**缓解措施**:
- 添加数据完整性校验
- 添加最小响应长度检查
- 记录解析失败的 chunk 数量

### 5.2 网络错误提示不友好

```javascript
// api.js:59, L177
console.error('[API] 连接失败:', error.message);
console.error('[API] 请求错误:', error.message);
```

**风险场景**:
```
用户遇到网络错误 → 只有 console 输出
→ 用户不知道发生了什么
→ 需要打开开发者工具才能看到错误
```

**影响范围**:
- 普通用户无法排查问题
- 用户体验差

**缓解措施**:
```javascript
// 添加用户友好的错误提示
UI.showErrorMessage('网络请求失败：' + error.message);
```

---

## 六、性能风险

### 6.1 DOM 更新频率过高

```javascript
// concurrent.js:124
onToken: (content, tokens, type) => {
    task.content = content;
    task.tokens = tokens;
    UI.updateTaskProgress(task);  // 每个 token 都更新 DOM!
}
```

**风险场景**:
```
大模型生成 1000 tokens → 1000 次 DOM 更新
→ 浏览器重排重绘 1000 次
→ 页面卡顿
```

**影响范围**:
- 长内容生成时页面卡顿
- 消耗用户设备性能

**缓解措施**:
```javascript
// 使用节流更新
let updateTimeout = null;
onToken: (content, tokens, type) => {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        UI.updateTaskProgress(task);
    }, 100);  // 100ms 节流
}
```

### 6.2 results 数组无限制增长

```javascript
// concurrent.js:150
this.results.push(result);
```

**风险场景**:
```
用户反复测试 → results 数组持续增长
→ 内存占用不断增加
→ 页面响应变慢
```

**影响范围**:
- 长期运行后性能下降
- 内存泄漏风险

**缓解措施**:
- 限制 results 数组最大长度
- 或只在 UI.addResultRow 后保留最近 N 条
- 添加 "清理内存" 功能

---

## 七、数据完整性风险

### 7.1 CSV 导出可能丢失数据

```javascript
// ui.js:433-468
exportToCsv() {
    const results = Concurrent.getResults();  // 获取所有 results
    // ... 生成 CSV
}
```

**风险场景**:
```
results 数组过长 (1000+ 条) → CSV 文件过大
→ 浏览器内存不足 → 导出失败
```

**影响范围**:
- 大量数据导出失败
- 用户需要多次操作

**缓解措施**:
- 添加分页导出功能
- 限制单次导出数量
- 使用流式写入 (Blob 流)

### 7.2 表格行数限制导致数据丢失

```javascript
// ui.js:379-381
while (this.elements.resultsTableBody.children.length > Config.maxTableRows) {
    this.elements.resultsTableBody.removeChild(
        this.elements.resultsTableBody.lastChild
    );
}
```

**风险场景**:
```
maxTableRows = 100
用户测试 200 次 → 前 100 次结果被删除
→ 用户无法查看早期结果
```

**影响范围**:
- 用户数据丢失
- 无法追溯历史

**缓解措施**:
- 添加 "查看全部结果" 功能
- 使用虚拟滚动优化性能
- 提供滚动查看已移除数据

---

## 八、安全性风险

### 8.1 未验证的 API 地址

```javascript
// ui.js:73
this.elements.apiUrl.value = event.target.value;
```

**风险场景**:
```
用户输入恶意地址 → 可能被重定向
→ 数据发送到恶意服务器
```

**影响范围**:
- 敏感数据泄露 (提示词、模型名称)
- 用户可能访问恶意网站

**缓解措施**:
```javascript
// 添加 URL 白名单验证
const validUrls = [
  /^https?:\/\/(127\.0\.0\.1|localhost|192\.168\.\d+\.\d+):(\d+)/
];
```

### 8.2 XSS 风险 (HTML 注入)

```javascript
// ui.js:360
row.innerHTML = `
    <td>${result.model}</td>
    <td>${result.inputTokens}</td>
    ...
`;
```

**风险场景**:
```
model 名称包含 <script> 标签 → 被注入执行
→ XSS 攻击
```

**影响范围**:
- 用户浏览器被攻击
- Cookie/Session 可能被窃取

**缓解措施**:
```javascript
// 使用textContent 或转义
td.textContent = result.model;
```

---

## 九、兼容性风险

### 9.1 AbortController 兼容性

```javascript
// concurrent.js:29
this.abortController = new AbortController();
```

**风险场景**:
```
旧版浏览器 (IE, Safari < 11) 不支持 AbortController
→ 测试功能完全失效
```

**影响范围**:
- 旧浏览器用户无法使用
- 需要 polyfill

**缓解措施**:
- 添加 polyfill
- 检测浏览器支持并提供降级方案

### 9.2 Fetch API 兼容性

```javascript
// api.js:41
const response = await fetch(url, { ... });
```

**风险场景**:
```
IE11 不支持 fetch
→ 所有功能失效
```

**影响范围**:
- 企业用户可能使用 IE

**缓解措施**:
- 添加 fetch polyfill
- 在 index.html 引入 polyfill 脚本

---

## 十、测试覆盖不足

### 10.1 缺少边界条件测试

```javascript
// 未测试场景
- 并发数 = 100 (最大值)
- 并发数 = 0 (非法值)
- prompt 为空字符串
- model 未选择
- API 返回空响应
- 响应中断 (网络不稳定)
- 服务器 503 (过载)
```

**风险**:
- 边界条件可能导致未处理错误
- 用户体验不一致

**缓解措施**:
- 添加单元测试
- 添加集成测试
- 进行压力测试

---

## 十一、修改优先级建议

| 风险编号 | 风险描述 | 优先级 | 修改难度 | 建议操作 |
|------|------|----|----|----|
| 4.2 | 停止机制无效 | 🔴 高 | ⭐⭐ | 立即修复 |
| 4.1 | 无限制并发 | 🟡 中 | ⭐⭐⭐ | 添加限流 |
| 6.1 | DOM 更新频繁 | 🟡 中 | ⭐ | 节流优化 |
| 8.2 | XSS 风险 | 🔴 高 | ⭐ | 立即修复 |
| 3.2 | 数据丢失风险 | 🟢 低 | ⭐⭐ | 添加导出功能 |
| 2.1 | 模块耦合 | 🟢 低 | ⭐⭐⭐⭐ | 长期重构 |
| 5.2 | 错误提示不友好 | 🟡 中 | ⭐ | 添加用户提示 |
| 9.1/9.2 | 浏览器兼容 | 🟢 低 | ⭐⭐ | 添加 polyfill |

---

## 十二、风险缓解代码示例

### 12.1 修复停止机制 (风险 4.2)

```javascript
// concurrent.js 修改
initialize(concurrentCount) {
    // 共享 AbortController
    this.abortController = new AbortController();
    
    this.tasks = [];
    for (let i = 1; i <= concurrentCount; i++) {
        this.tasks.push({ id: i, status: 'pending' });
    }
}

async runRequest(id, config) {
    // 使用共享的 abortController
    const stream = await API.chat(
        config.prompt,
        config.model,
        config.temperature,
        this.abortController  // 修改这里
    );
    // ...
}
```

### 12.2 防止 XSS (风险 8.2)

```javascript
// ui.js 修改
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

addResultRow(result) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${escapeHtml(result.id.toString().padStart(3, '0'))}</td>
        <td>${escapeHtml(result.model)}</td>
        ...
    `;
}
```

### 12.3 添加节流更新 (风险 6.1)

```javascript
// concurrent.js 修改
runRequest(id, config) {
    // ...
    
    let updateTimeout = null;
    const throttledUpdate = (task) => {
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            UI.updateTaskProgress(task);
        }, 100);
    };
    
    await API.parseStream(stream, 
        (content, tokens, type) => {
            task.content = content;
            task.tokens = tokens;
            throttledUpdate(task);  // 节流更新
        },
        // ...
    );
}
```
