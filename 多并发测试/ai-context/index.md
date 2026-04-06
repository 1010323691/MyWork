# 大模型多并发测试 - 项目全局索引

> 本目录包含项目的结构化深度分析，用于快速定位修改文件和理解调用链。

## 快速导航

| 文件 | 说明 |
|------|------|
| [ui.md](./ui.md) | UI 层分析 - DOM 结构、事件绑定、渲染逻辑 |
| [state.md](./state.md) | 状态管理分析 - 数据流、状态同步 |
| [logic.md](./logic.md) | 业务逻辑分析 - 并发控制、任务调度 |
| [api.md](./api.md) | API 通信分析 - vLLM/Ollama 接口封装 |
| [risk.md](./risk.md) | 风险点分析 - 潜在 Bug 和耦合区域 |

---

## 一、项目结构总览

### 文件清单

```
多并发测试/
├── index.html              # 入口文件 (Entry Point)
├── css/
│   └── style.css           # 样式表 (CSS Variables + 响应式布局)
├── js/
│   ├── config.js           # 配置文件 (常量定义)
│   ├── api.js              # API 通信模块
│   ├── concurrent.js       # 并发测试核心模块
│   ├── ui.js               # UI 渲染模块
│   └── main.js             # 应用入口 (初始化 + 业务流程控制)
└── ai-context/             # 本分析目录
```

### 文件职责一句话说明

| 文件 | 职责 |
|------|------|
| `index.html` | HTML 结构 + 脚本加载顺序控制 |
| `css/style.css` | 全局样式 + 响应式设计 + 动画效果 |
| `js/config.js` | 常量定义 (API 地址、默认值、存储键名) |
| `js/api.js` | vLLM/Ollama API 封装 (连接检查、模型列表、流式请求) |
| `js/concurrent.js` | 并发任务管理 (任务队列、状态追踪、QPS 统计) |
| `js/ui.js` | DOM 操作 + 事件绑定 + 结果渲染 |
| `js/main.js` | 应用初始化 + 测试流程编排 |

---

## 二、核心模块划分

```
┌─────────────────────────────────────────────────┐
│                    UI 层                         │
│               (js/ui.js)                        │
│  - DOM 元素缓存                                  │
│  - 事件绑定                                      │
│  - 状态显示更新                                  │
└──────────────┬──────────────────────────────────┘
               │ 调用
               ▼
┌─────────────────────────────────────────────────┐
│                 应用入口                         │
│              (js/main.js)                       │
│  - App.init() 初始化                            │
│  - App.startTest() 测试编排                     │
└──────────────┬──────────────────────────────────┘
               │ 调用
               ▼
┌─────────────────────────────────────────────────┐
│              并发测试核心                        │
│           (js/concurrent.js)                    │
│  - 任务队列管理                                  │
│  - 并发控制                                      │
│  - 结果收集                                      │
└──────────────┬──────────────────────────────────┘
               │ 调用
               ▼
┌─────────────────────────────────────────────────┐
│               API 通信层                          │
│              (js/api.js)                        │
│  - API 类型切换 (vLLM/Ollama)                   │
│  - 流式响应解析                                  │
└──────────────┬──────────────────────────────────┘
               │ 依赖
               ▼
┌─────────────────────────────────────────────────┐
│               配置层                             │
│             (js/config.js)                      │
│  - 常量定义                                      │
│  - 默认值                                        │
└─────────────────────────────────────────────────┘
```

### 模块依赖关系

```
main.js
  ├── UI (依赖)
  ├── Concurrent (依赖)
  └── API (间接依赖 via Concurrent)

Concurrent.js
  ├── API (依赖)
  └── UI (回调更新)

API.js
  └── Config (依赖)

UI.js
  ├── App (事件回调)
  ├── Concurrent (读取状态)
  └── Config (依赖)
```

---

## 三、关键调用链

### 调用链 1: 用户点击"开始测试"

```
1. index.html:80 <button id="startBtn"> 触发 click 事件
   ↓
2. ui.js:108 UI.bindEvents() 事件监听器捕获
   ↓
3. ui.js:109 App.startTest() 调用
   ↓
4. main.js:102 App.startTest() 验证输入
   ↓
5. main.js:106 App.getTestConfig() 获取配置
   ↓
6. main.js:109 Concurrent.initialize(concurrentCount) 初始化任务
   ↓
7. concurrent.js:27 Concurrent.initialize() 创建任务队列
   ↓
8. main.js:112 UI.setTesting(true) 更新 UI 状态
   ↓
9. main.js:120 Concurrent.runAll(config) 启动并发
   ↓
10. concurrent.js:188 Concurrent.runAll() 并行启动所有请求
    ↓
11. concurrent.js:201-204 遍历任务 → runRequest()
    ↓
12. concurrent.js:88 Concurrent.runRequest(id, config) 单次请求
    ↓
13. api.js:104 API.chat() 发送流式请求
    ↓
14. api.js:189 API.parseStream() 解析响应流
    ↓
15. concurrent.js:118-161 onComplete 回调 → 更新 UI
    ↓
16. ui.js:354 UI.addResultRow() 添加结果行
```

### 调用链 2: 切换 API 类型

```
1. index.html:34 <select id="apiTypeSelect"> 触发 change 事件
   ↓
2. ui.js:56 UI.bindEvents() change 事件监听器
   ↓
3. ui.js:57-70 保存设置 → 更新默认 URL → 刷新模型列表
   ↓
4. ui.js:69 App.loadModels() 调用
   ↓
5. main.js:47 App.loadModels() 加载模型
   ↓
6. api.js:67 API.getModels() 获取模型列表
   ↓
7. api.js:71-91 根据 apiType 调用不同端点
   ↓
8. main.js:74-84 填充下拉框
   ↓
9. ui.js:44 UI.updateConnectionStatus() 更新状态
```

---

## 四、关键数据流

### 状态数据存储位置

| 状态 | 存储位置 | 同步到 localStorage |
|------|----------|---------------------|
| API 类型 | `localStorage` + `UI.elements.apiTypeSelect.value` | ✅ `ui.js:58` |
| API 地址 | `localStorage` + `UI.elements.apiUrl.value` | ✅ `ui.js:74` |
| 模型选择 | `localStorage` + `UI.elements.modelSelect.value` | ✅ `ui.js:79` |
| 提示词 | `localStorage` + `UI.elements.promptInput.value` | ✅ `ui.js:84` |
| 并发数 | `localStorage` + `UI.elements.concurrentCount.value` | ✅ `ui.js:93` |
| Temperature | `localStorage` + `UI.elements.temperature.value` | ✅ `ui.js:98` |
| 运行中任务 | `Concurrent.tasks[]` | ❌ 内存状态 |
| 测试结果 | `Concurrent.results[]` | ❌ 内存状态 |
| QPS 统计 | `Concurrent.requestTimestamps[]` | ❌ 内存状态 |

### 数据流动方向

```
用户输入 → UI.elements → localStorage (持久化)
                   ↓
            App.getTestConfig() 收集
                   ↓
         Concurrent.runRequest() 执行
                   ↓
           API.chat() → parseStream()
                   ↓
             onComplete 回调
                   ↓
        Concurrent.results[] 存储
                   ↓
           UI.addResultRow() 渲染
```

---

## 五、修改定位指南

| 问题类型 | 优先查看文件 | 关键函数/位置 |
|----------|--------------|---------------|
| **UI 不生效** | `ui.js` | `UI.init()` L13, `UI.bindEvents()` L54 |
| **点击事件无效** | `ui.js` | `UI.bindEvents()` L54-132 |
| **样式异常** | `css/style.css` | CSS Variables L4-58 |
| **数据未更新** | `ui.js` | `UI.updateMetrics()` L234, `UI.addResultRow()` L354 |
| **API 异常** | `api.js` | `API.chat()` L104, `API.checkConnection()` L31 |
| **模型列表加载失败** | `api.js` | `API.getModels()` L67 |
| **并发数不准** | `concurrent.js` | `Concurrent.initialize()` L27, `Concurrent.runAll()` L188 |
| **任务状态异常** | `concurrent.js` | `Concurrent.runRequest()` L88 |
| **配置未保存** | `ui.js` | `UI.loadSavedConfig()` L484 |
| **导出 CSV 异常** | `ui.js` | `UI.exportToCsv()` L433 |
| **默认值修改** | `config.js` | `Config` 对象 L6-48 |
| **流式显示异常** | `api.js` | `API.parseStream()` L189 |
| **TTFT/QPS 计算异常** | `concurrent.js` | `Concurrent.startQpsCalc()` L224 |

---

## 六、全局注意事项

1. **所有模块通过全局变量暴露**: `window.App`, `window.UI`, `window.Concurrent`, `window.API`, `window.Config`

2. **脚本加载顺序** (index.html 行 177-181):
   ```
   config.js → api.js → concurrent.js → ui.js → main.js
   ```

3. **模块间调用约定**:
   - `UI` 模块主动调用 `App` 方法 (事件处理)
   - `Concurrent` 模块主动调用 `UI` 方法 (状态更新)
   - `API` 模块被动被调用

4. **错误处理**:
   - API 错误：`api.js` 内有重试机制 (Ollama 模型加载)
   - 通用错误：console.error 记录，部分弹窗提示
