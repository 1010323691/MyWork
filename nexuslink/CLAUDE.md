# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 在此仓库中工作时的指导文件。

## 项目概述

NexusLink 是一个基于 **Wails 2 + Vue 3** 的桌面应用程序，用于管理 frp（反向代理）服务。用户可通过 API 认证、获取 frp 配置，并通过现代化的 Ant Design Vue 界面控制 frp 客户端。

## 技术栈

- **后端**: Go 1.23.0 + Wails 2 框架
- **前端**: Vue 3 + TypeScript + Vite
- **UI 组件**: Ant Design Vue 3.2
- **样式**: Tailwind CSS 3.4 + PostCSS
- **状态管理**: Pinia
- **路由**: Vue Router 4（hash 模式）

## 关键命令

```bash
# 开发模式（热更新）
wails dev

# 生产构建
wails build

# 仅前端（浏览器调试 UI）
cd frontend && npm run dev

# 仅前端构建
cd frontend && npm run build
```

## 架构

### Go 后端结构 (`internal/`)

```
internal/
├── auth/      # 认证管理（token 认证，开发绕过："123456"）
├── config/    # NexusLink/frp配置管理
├── service/   # frp 服务生命周期管理（启停/重启）- 嵌入 frpc.exe
├── storage/   # 本地设置/token 持久化
└── logger/    # 应用日志
```

### 前端结构 (`frontend/src/`)

```
src/
├── views/     # 页面组件（LoginView, DashboardView, SettingsView）
├── stores/    # Pinia 状态管理（auth.ts, service.ts）
├── router/    # Vue Router 及路由守卫（requiresAuth meta）
└── styles/    # Tailwind CSS + 自定义样式
```

## 核心概念

### 认证流程

1. 用户在登录页输入 API token
2. 开发模式使用 token `"123456"` 可绕过 API（见 `internal/auth/manager.go:10`）
3. Token 存储在 `localStorage` 和 `internal/storage/local.go`
4. 路由守卫：登录后跳转 `/dashboard`，未登录跳转 `/login`

### 服务管理

- `ServiceManager` 嵌入 `frpc.exe` 二进制文件（`go:embed frpc.exe`）
- 启动时解压到临时目录（`os.TempDir()`）
- 从 `NexusConfig` 动态生成 TOML 配置
- 配置持久化路径：`~/.nexuslink/nexuslink.toml`

### API 集成

基础 URL 在 `app.go:39` 可配置：
```go
apiBase := "https://api.example.com"
```

使用的接口：
- `POST /api/login` - Token 验证
- `GET /api/user/info` - 获取用户信息

## Wails 绑定

Wails 将 `App` 结构体方法（`app.go`）绑定到前端，通过 `window.go.Auth.*` 调用：

- `Login(token)`, `Logout()`, `IsLoggedIn()`, `GetUserInfo()`
- `FetchConfig()`, `LoadLocalConfig()`, `SaveConfig(cfgJSON)`
- `StartService()`, `StopService()`, `RestartService()`, `GetServiceStatus()`
- `GetSettings()`, `SaveSettings(settingsJSON)`

## 开发注意事项

- 路由使用 `createWebHashHistory()` 以兼容 Wails
- 开发模式每次刷新会清除 `localStorage`（见 `router/index.ts:38`）
- 前端类型定义 `frontend/wailsjs/go/models.ts` 由 Wails 自动生成
- 窗口尺寸：1024x768，深色背景 `#1b2636`（见 `main.go`）
