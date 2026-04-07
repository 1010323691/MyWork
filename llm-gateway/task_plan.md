# 任务计划：认证模块重构（纯 Token 认证）

## 目标
将项目的登录和安全认证模块完全重写，放弃 session 和重定向，实现纯 Token（JWT）认证方式。

## 当前阶段
阶段 1：分析与规划

## 背景问题（为什么重构）

### 现有问题
1. **混合认证方式混乱**：一半用 session（Spring Security 默认），一半用 token（自己写的）
2. **Spring Security 默认行为冲突**：默认使用 session + formLogin + redirect，但项目需要的是 stateless API + JWT + JSON
3. **前后端认证逻辑耦合**：ViewController 中检查认证状态并做重定向，与纯 API 设计不符

### 目标架构
- **Stateless API**：无状态，不使用 session
- **JWT Token**：唯一认证凭据
- **JSON 响应**：所有接口返回 JSON
- **前端管理 Token**：localStorage 存储，每次请求携带

---

## 各阶段

### 阶段 1：分析与发现
- [x] 阅读 index.md 了解项目结构
- [x] 阅读 security.md 了解安全模块
- [x] 阅读 controller.md 了解 API 接口
- [x] 阅读 ui.md 了解前端结构
- [x] 分析现有代码问题
- [ ] 确定重构方案细节
- **状态：** in_progress

### 阶段 2：后端重构
- [ ] 重构 `SecurityConfig.java`
  - 确认 `SessionCreationPolicy.STATELESS` 已配置
  - 移除所有 session 相关配置
  - 确保过滤器链正确
- [ ] 重构 `AuthController.java`
  - 简化登录接口，只返回 token
  - 移除不必要的响应字段
- [ ] 重构 `JwtAuthenticationFilter.java`
  - 清理跳过路径逻辑
  - 简化 token 验证流程
- [ ] 重构 `ViewController.java`
  - 移除认证检查和重定向逻辑
  - 页面直接返回，由前端处理认证
- **状态：** pending

### 阶段 3：前端重构
- [ ] 重构 `login.js`
  - 简化登录流程
  - 只保存 token 到 localStorage
- [ ] 重构 `dashboard.js`
  - 移除 session 相关检查
  - 纯 token 验证逻辑
- [ ] 重构 `common.js`
  - 简化 API 类的 token 处理
  - 统一 401 处理方式
- **状态：** pending

### 阶段 4：测试验证
- [ ] 测试登录流程
- [ ] 测试 token 携带请求
- [ ] 测试 token 过期处理
- [ ] 测试退出登录
- [ ] 测试 API Key 认证（保持不变）
- **状态：** pending

### 阶段 5：清理与交付
- [ ] 删除无用代码
- [ ] 更新 ai-context 文档
- [ ] 编写 git 提交信息
- **状态：** pending

---

## 关键问题
1. 现有 SecurityConfig 已经配置了 STATELESS，为什么还有 session 相关代码？
2. ViewController 中的认证检查是否需要保留，还是完全移到前端？
3. API Key 认证是否保持不变，只重构 JWT 部分？

---

## 已做决策
| 决策 | 理由 |
|------|------|
| 完全移除 session | 纯 token 认证不需要 session，保持架构一致性 |
| 移除后端重定向 | 前后端分离架构，路由由前端控制 |
| 保留 API Key 认证 | 不影响现有功能，只重构用户登录部分 |
| 401 响应由前端处理 | 前端统一跳转到登录页，后端只返回状态码 |

---

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|----------|
| | 1 | |

---

## 文件修改清单

### 后端文件
- `SecurityConfig.java` - 安全配置
- `AuthController.java` - 登录注册接口
- `JwtAuthenticationFilter.java` - JWT 过滤器
- `ViewController.java` - 页面路由

### 前端文件
- `login.js` - 登录逻辑
- `dashboard.js` - 管理后台逻辑
- `common.js` - 公共 API 工具

---

## 认证流程对比

### 现有流程（混乱）
```
用户访问 /dashboard
  → ViewController 检查 session
  → 无 session → 重定向到 /login
  → 登录成功 → 返回 token + 设置 session
  → 前端保存 token
  → 后续请求携带 token + Spring Security 可能还检查 session
```

### 目标流程（清晰）
```
用户访问 /dashboard
  → 直接返回页面（不检查认证）
  → 前端 JS 检查 localStorage.token
  → 无 token → 跳转到 /login
  → 登录成功 → 返回 {token: "xxx"}
  → 前端保存 token
  → 后续请求携带 Bearer token
  → 后端 JWT 过滤器验证
```

---

## 减法清单（移除的）
- ❌ Spring Security session 管理
- ❌ ViewController 中的认证检查
- ❌ 重定向逻辑（后端）
- ❌ session 相关的任何配置

## 加法清单（新增的）
- ✅ 前端统一的认证检查
- ✅ 前端 401 处理（跳转到登录）
- ✅ 简化的后端响应
