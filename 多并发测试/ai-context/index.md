# 大模型多并发测试 - 全局索引

## 工程路径
`D:\projectPath\MyWork\多并发测试`

## 任务执行流程

1. **定位模块**：根据修改需求确定涉及模块 (ui/state/logic/api)
2. **查阅文档**：在对应 `.md` 文件中查找结构与调用链
3. **修改代码**：修改对应 JS 文件
4. **同步文档**：结构/方法体/核心逻辑变更时更新 `ai-context/` 对应模块
5. **提交代码**：执行 git 提交

## 模块概览

| 模块 | 文件 | 职责 |
|------|------|------|
| **入口** | `index.html` | 页面结构与模块加载 |
| **UI 层** | `ui.md` → `js/ui.js`, `css/style.css` | DOM 操作、事件绑定、界面渲染 |
| **状态管理** | `state.md` → `Concurrent` 对象 | 并发任务状态、测试结果存储 |
| **业务逻辑** | `logic.md` → `js/main.js`, `js/concurrent.js` | 流程控制、并发调度 |
| **API 通信** | `api.md` → `js/api.js` | Ollama/vLLM 接口封装 |
| **配置** | `js/config.js` | 常量与默认配置 |
| **风险点** | `risk.md` | 潜在问题与注意事项 |

## 快速导航

- UI 修改 → `ui.md`
- 并发逻辑修改 → `logic.md`
- API 协议修改 → `api.md`
- 状态管理修改 → `state.md`
- 风险评估 → `risk.md`
