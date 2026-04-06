# 项目索引 - 并发测试工具

## 工程路径
`D:\projectPath\MyWork\多并发测试`

## 项目描述
一个用于测试 LLM 服务（Ollama/vLLM）并发性能的前端工具，支持同时发送多个请求并统计各项性能指标。

## 入口文件
- `index.html` - 主页面
- `js/main.js` - JS 入口（DOMContentLoaded 时初始化）

## 任务执行流程
1. 先阅读本 `index.md`，确定涉及模块
2. 在对应模块文档中查阅结构，再修改对应代码文件（若无必要无需查阅无关文档）
3. 如涉及结构、方法体或核心实现重大变更，需同步更新 `/ai-context/` 对应模块说明
4. **执行 git 提交**（若环境不支持 git：必须输出完整 commit 命令 + 提交说明，供人工执行）

## 模块说明

| 文档 | 职责 |
|------|------|
| [ui.md](ui.md) | UI 层 - DOM 元素管理、事件绑定、界面渲染 |
| [state.md](state.md) | 状态管理 - Concurrent 对象的任务状态、结果存储 |
| [logic.md](logic.md) | 业务逻辑 - App 对象的业务流程控制 |
| [api.md](api.md) | API 通信 - Ollama/vLLM API 调用与流式响应解析 |
| [risk.md](risk.md) | 风险点 - 潜在 bug、耦合区域、修改注意事项 |

## 核心文件速查

| 文件 | 一句话说明 |
|------|-----------|
| `js/main.js` | 应用入口，App 对象，业务流程控制 |
| `js/concurrent.js` | 并发测试核心，任务管理与执行 |
| `js/api.js` | API 模块，封装 Ollama/vLLM 请求 |
| `js/ui.js` | UI 模块，DOM 操作与事件绑定 |
| `js/config.js` | 配置常量与默认值 |
