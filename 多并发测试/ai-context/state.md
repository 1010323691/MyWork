# 状态管理文档

## 文件
- `js/concurrent.js` - Concurrent 对象（状态存储与任务管理）
- `js/config.js` - Config 对象（常量配置）
- `localStorage` - 用户偏好配置

## 模块职责
- 管理并发测试的全局状态
- 存储任务队列与执行结果
- 提供 QPS 统计
- 提供停止与清空功能

---

## 状态字段（Concurrent 对象）

### 测试状态
| 字段 | 类型 | 说明 |
|------|------|------|
| `isRunning` | boolean | 测试是否正在进行 |
| `abortController` | AbortController | 用于取消所有请求 |

### 任务计数
| 字段 | 类型 | 说明 |
|------|------|------|
| `tasks` | Array | 任务队列（每个任务含 id, status, result） |
| `pendingCount` | number | 等待中的任务数 |
| `runningCount` | number | 运行中的任务数 |
| `completedCount` | number | 已完成的任务数 |
| `totalCount` | number | 总任务数 |

### 结果存储
| 字段 | 类型 | 说明 |
|------|------|------|
| `results` | Array | 所有完成的任务结果 |

### QPS 统计
| 字段 | 类型 | 说明 |
|------|------|------|
| `requestTimestamps` | Array | 请求开始时间戳数组 |
| `lastQpsCalc` | number | 上次 QPS 计算时间 |
| `currentQps` | number | 当前 QPS 值 |

---

## 核心方法

### 初始化与清理
- `initialize(concurrentCount)` - 初始化测试状态，创建任务队列（保留已有 results）
- `stop()` - 停止测试（设置 isRunning=false，触发 abort）
- `clear()` - 清空所有状态（结果、任务、计数）

### 任务检查
- `checkAllCompleted()` - 检查所有任务是否完成

### 请求执行
- `runRequest(id, config)` - 运行单次请求（核心执行逻辑）
- `runAll(config)` - 运行所有并发请求（调用 Promise.allSettled）

### QPS 计算
- `startQpsCalc()` - 启动 QPS 计算定时器
- `stopQpsCalc()` - 停止 QPS 计算

### 结果获取
- `getResults()` - 返回结果副本

---

## 任务状态流转

```
pending → running → completed
                   → error
                   → aborted
```

---

## 配置存储（localStorage）

| Key（Config.storageKeys.*） | 说明 |
|----------------------------|------|
| `api_url` | API 地址 |
| `api_type` | API 类型（ollama/vllm） |
| `model` | 选择的模型 |
| `prompt` | 提示词 |
| `concurrent_count` | 并发数 |
| `temperature` | 温度参数 |

---

## 修改指引

| 问题类型 | 查看位置 |
|----------|----------|
| 状态未重置 | `initialize()`、`clear()` |
| 任务计数错误 | `runRequest()` 中的计数逻辑 |
| 停止不生效 | `stop()`、`abortController` |
| QPS 不准 | `startQpsCalc()`、`qpsWindow` 配置 |
| 结果丢失 | `results` 数组操作 |
