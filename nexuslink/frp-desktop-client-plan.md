# FRP Windows 桌面客户端技术方案

## 项目概述

开发一个 Windows 单文件 EXE 客户端，用户双击即可启动，无需任何环境配置。客户端通过公网 API 获取 frp 配置，自动启动本地 frp 服务，支持托盘运行和开机自启。**重点：现代化 UI 设计，优秀的视觉体验。**

---

## 技术选型

### 1. 后端语言：Go

**选择理由：**
- frp 本身就是 Go 开发，可复用 frp 的核心库
- 高性能，单文件编译
- 优秀的网络编程生态
- 跨平台支持完善

### 2. 桌面框架：Wails 2 + Vue 3

**选择理由：**
- **Wails 2**：Go 后端 + 前端 UI 的完美桥梁
- **Vue 3**：现代化前端框架，组件生态丰富
- 支持完整 CSS/JS 生态，界面可高度定制
- 打包成单文件 exe，用户体验好

### 3. UI 组件库推荐

| 组件库 | 特点 | 适合场景 |
|--------|------|----------|
| **Ant Design Vue** | 企业级组件，专业美观 | ⭐⭐⭐⭐⭐ 推荐 |
| **Element Plus** | 简洁现代，文档完善 | ⭐⭐⭐⭐ |
| **Naive UI** | 轻量级，主题定制灵活 | ⭐⭐⭐⭐ |
| **Shadcn-Vue** | 最现代化设计，深色主题优美 | ⭐⭐⭐⭐⭐ 推荐 |

### 4. 样式方案

| 方案 | 描述 |
|------|------|
| **Tailwind CSS** | 原子化 CSS，快速构建现代 UI |
| **CSS Variables** | 实现深色/浅色主题切换 |
| **Animate.css** | 现成的动画效果库 |

**推荐组合：Wails 2 + Vue 3 + Vite + Ant Design Vue + Tailwind CSS**

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     FRP 桌面客户端                           │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Vue 3 + Ant Design Vue + Tailwind)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │登录页面  │ │状态面板  │ │配置管理  │ │日志查看  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│  Wails Bridge (Go ↔ JavaScript)                            │
├─────────────────────────────────────────────────────────────┤
│  Backend (Go)                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │AuthManager│ │ConfigMgr │ │ServiceMgr│                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │HTTP Client│ │FRP Client│ │LocalStore│                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 项目目录结构

```
frp-desktop-client/
├── main.go                 # Go 入口
├── go.mod
├── wails.json             # Wails 配置
├── package.json           # 前端依赖
├── vite.config.ts         # Vite 配置
├── tailwind.config.js     # Tailwind 配置
├── assets/                # 静态资源（图标等）
│   └── icon.ico
├── cmd/
│   └── build/
│       └── build.ps1      # Windows 构建脚本
├── internal/              # Go 后端代码
│   ├── auth/
│   │   └── manager.go     # 认证管理
│   ├── config/
│   │   ├── manager.go     # 配置管理
│   │   └── frp_types.go   # frp 配置结构
│   ├── service/
│   │   └── manager.go     # frp 服务管理
│   ├── storage/
│   │   └── local.go       # 本地存储
│   ├── logger/
│   │   └── logger.go      # 日志模块
│   └── tray/
│       └── tray.go        # 托盘管理 (wails/tray)
├── frontend/              # Vue 3 前端代码
│   ├── index.html
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── styles/
│   │   │   └── tailwind.css
│   │   ├── views/
│   │   │   ├── LoginView.vue
│   │   │   └── DashboardView.vue
│   │   ├── components/
│   │   │   ├── StatusCard.vue
│   │   │   ├── ProxyList.vue
│   │   │   ├── LogViewer.vue
│   │   │   └── ConfigEditor.vue
│   │   ├── stores/
│   │   │   ├── auth.ts    # Pinia 状态管理
│   │   │   └── service.ts
│   │   └── api/
│   │       └── goCall.ts  # 调用 Go 的接口
└── pkg/
    └── frp/               # frp 库的封装
```

---

## 关键代码示例

### Go 主程序入口

```go
package main

import (
    "log"
    "os"

    "github.com/wails.io/wails/v2"
    "github.com/wails.io/wails/v2/pkg/options"
    "github.com/wails.io/wails/v2/pkg/options/assetserver"
)

func main() {
    // 创建 Wails 应用
    app := wails.AppRun(&options.App{
        Title:     "FRP Desktop Client",
        Width:     1200,
        Height:    800,
        MinWidth:  800,
        MinHeight: 600,
        AssetServer: &assetserver.Options{
            Url: "./frontend/dist",
        },
        BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 255},
        // 无边框窗口，现代化设计
        WindowStartState: options.FullScreen,
        // 支持深色主题
        EnableDefaultContextMenu: true,
    })

    if app == nil {
        log.Fatal("Failed to create app")
        os.Exit(1)
    }
    
    log.Fatal(app)
}
```

### Go 后端 API（供前端调用）

```go
// internal/auth/manager.go
package auth

import (
    "encoding/json"
    "net/http"
    "time"
)

type AuthManager struct {
    token     string
    apiBase   string
    httpClient *http.Client
}

func NewManager() *AuthManager {
    return &AuthManager{
        apiBase: "https://api.yourdomain.com",
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

// Login 登录接口，前端可调用
func (am *AuthManager) Login(token string) (bool, error) {
    req, _ := http.NewRequest("POST", am.apiBase+"/login", nil)
    req.Header.Set("Authorization", "Bearer "+token)
    
    resp, err := am.httpClient.Do(req)
    if err != nil {
        return false, err
    }
    defer resp.Body.Close()
    
    if resp.StatusCode == http.StatusOK {
        am.token = token
        // 存储到本地
        return true, nil
    }
    return false, errors.New("invalid token")
}

// UserInfo 获取用户信息
func (am *AuthManager) UserInfo() (*UserInfo, error) {
    resp, err := am.httpClient.Get(am.apiBase+"/user/info")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var userInfo UserInfo
    json.NewDecoder(resp.Body).Decode(&userInfo)
    return &userInfo, nil
}

type UserInfo struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}
```

### Vue 3 前端示例 - 登录页面

```vue
<!-- frontend/src/views/LoginView.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
    <!-- 背景动画效果 -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="animate-float absolute w-64 h-64 bg-white/10 rounded-full -top-32 -left-32"></div>
      <div class="animate-float absolute w-96 h-96 bg-white/10 rounded-full -bottom-48 -right-48" style="animation-delay: 2s"></div>
    </div>
    
    <!-- 登录卡片 -->
    <a-card class="w-full max-w-md shadow-2xl backdrop-blur-sm bg-white/95">
      <template #cover>
        <div class="h-40 flex items-center justify-center bg-gradient-to-r from-blue-400 to-purple-600">
          <div class="text-white text-6xl">🚀</div>
        </div>
      </template>
      <template #title>
        <h2 class="text-2xl font-bold text-gray-800">FRP Desktop Client</h2>
      </template>
      <template #extra>
        <a-tag color="blue">v1.0.0</a-tag>
      </template>
      <template #default>
        <a-form @submit.prevent="handleLogin" layout="vertical">
          <a-form-item 
            label="API Token" 
            :rules="[{ required: true, message: '请输入 Token' }]"
          >
            <a-input
              v-model:value="token"
              placeholder="请输入您的 API Token"
              size="large"
              :prefix="icon('key')"
            />
          </a-form-item>
          
          <a-form-item>
            <a-checkbox v-model:checked="remember">记住我的登录信息</a-checkbox>
          </a-form-item>
          
          <a-button 
            type="primary" 
            html-type="submit" 
            size="large" 
            block 
            :loading="loading"
            class="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {{ loading ? '登录中...' : '登录' }}
          </a-button>
        </a-form>
        
        <div class="mt-4 text-center text-sm text-gray-500">
          首次使用？<a href="#" class="text-blue-500">获取 Token</a>
        </div>
      </template>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'

const token = ref('')
const remember = ref(false)
const loading = ref(false)
const authStore = useAuthStore()

const handleLogin = async () => {
  loading.value = true
  try {
    const success = await window.go.Auth.Login(token.value)
    if (success) {
      message.success('登录成功')
      // 跳转到首页
      window.router.push('/dashboard')
    }
  } catch (error: any) {
    message.error('登录失败：' + error.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(10deg); }
}
.animate-float {
  animation: float 6s ease-in-out infinite;
}
</style>
```

### Vue 3 前端示例 - 主面板

```vue
<!-- frontend/src/views/DashboardView.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <!-- 顶部导航 -->
    <nav class="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
            🚀
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-800">FRP 控制台</h1>
            <p class="text-xs text-gray-500">欢迎回来，{{ userInfo.name }}</p>
          </div>
        </div>
        <a-space>
          <a-button @click="toggleTray" :icon="icon('down')">
            托盘
          </a-button>
          <a-dropdown>
            <a-button :icon="icon('user')">
              {{ userInfo.name }}
            </a-button>
            <template #overlay>
              <a-menu @click="handleMenuClick">
                <a-menu-item key="settings">设置</a-menu-item>
                <a-menu-item key="logout">退出登录</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </div>
    </nav>

    <!-- 主内容区 -->
    <div class="max-w-7xl mx-auto p-6">
      <!-- 状态卡片 -->
      <a-row :gutter="[16, 16]" class="mb-6">
        <a-col :xs="24" :sm="12" :md="8">
          <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500 mb-1">服务状态</p>
                <p class="text-2xl font-bold" :class="statusColor">
                  {{ statusLabel }}
                </p>
              </div>
              <div :class="statusIconClass" class="text-4xl">
                {{ statusIcon }}
              </div>
            </div>
          </div>
        </a-col>
        
        <a-col :xs="24" :sm="12" :md="8">
          <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500 mb-1">运行时间</p>
                <p class="text-2xl font-bold text-gray-800">
                  {{ uptime }}
                </p>
              </div>
              <div class="text-4xl">⏱️</div>
            </div>
          </div>
        </a-col>
        
        <a-col :xs="24" :sm="12" :md="8">
          <div class="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500 mb-1">代理数量</p>
                <p class="text-2xl font-bold text-gray-800">
                  {{ proxies.length }}
                </p>
              </div>
              <div class="text-4xl">🔗</div>
            </div>
          </div>
        </a-col>
      </a-row>

      <!-- 操作按钮 -->
      <a-space class="mb-6">
        <a-button 
          type="primary" 
          :icon="icon('play-circle')"
          @click="startService"
          :disabled="serviceStatus === 'running'"
        >
          启动
        </a-button>
        <a-button 
          danger 
          :icon="icon('stop-circle')"
          @click="stopService"
          :disabled="serviceStatus !== 'running'"
        >
          停止
        </a-button>
        <a-button 
          :icon="icon('reload')"
          @click="refreshConfig"
        >
          刷新配置
        </a-button>
        <a-button 
          :icon="icon('setting')"
          @click="showConfigEditor = true"
        >
          配置
        </a-button>
      </a-space>

      <!-- 代理列表 -->
      <a-card title="代理列表" class="mb-6">
        <template #extra>
          <a-button type="dashed" :icon="icon('plus')">添加代理</a-button>
        </template>
        <a-table 
          :dataSource="proxies" 
          :columns="columns"
          :loading="loading"
          bordered
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="record.status === 'online' ? 'success' : 'default'">
                {{ record.status === 'online' ? '运行中' : '已停止' }}
              </a-tag>
            </template>
            <template v-if="column.key === 'action'">
              <a-space>
                <a-button size="small" :icon="icon('edit')">编辑</a-button>
                <a-button size="small" danger :icon="icon('delete')">删除</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-card>

      <!-- 日志面板 -->
      <a-collapse defaultActiveKey=["1"]>
        <a-collapse-panel header="实时日志" key="1">
          <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
            <div v-for="(log, index) in logs" :key="index">
              <span class="text-gray-500">[{{ log.time }}]</span>
              <span :class="log.levelClass">{{ log.message }}</span>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useServiceStore } from '@/stores/service'

const serviceStore = useServiceStore()
const serviceStatus = computed(() => serviceStore.status)
const proxies = computed(() => serviceStore.proxies)
const logs = computed(() => serviceStore.logs)
const userInfo = computed(() => useAuthStore().userInfo)

const statusColor = computed(() => 
  serviceStatus.value === 'running' ? 'text-green-500' : 'text-gray-500'
)
const statusLabel = computed(() => 
  serviceStatus.value === 'running' ? '运行中' : '已停止'
)
const statusIcon = computed(() => 
  serviceStatus.value === 'running' ? '✅' : '⏹️'
)

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '本地端口', dataIndex: 'local_port', key: 'local_port' },
  { title: '远程端口', dataIndex: 'remote_port', key: 'remote_port' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'action' },
]

const startService = async () => {
  await serviceStore.start()
}

const stopService = async () => {
  await serviceStore.stop()
}

const refreshConfig = async () => {
  await serviceStore.refreshConfig()
}
</script>
```

### Wails 配置 (wails.json)

```json
{
  "$schema": "https://wails.io/schemas/v2/wails.json",
  "name": "frp-desktop-client",
  "outputfilename": "frp-client",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev": "npm run dev",
  "wailsignore": {},
  "author": {
    "name": "Your Name",
    "email": "your@email.com"
  }
}
```

### Vite 配置 (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [vue()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'ant-design-vue'],
        },
      },
    },
  },
})
```

### Tailwind 配置 (tailwind.config.js)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./frontend/index.html', './frontend/src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}
```

---

## 核心功能模块

### 1. 认证模块 (AuthManager)

```go
// internal/auth/manager.go
type AuthManager struct {
    token      string
    apiBase    string
    httpClient *http.Client
}

// 前端可调用的方法
func (am *AuthManager) Login(token string) (bool, error)
func (am *AuthManager) Logout()
func (am *AuthManager) IsLoggedIn() bool
func (am *AuthManager) UserInfo() (*UserInfo, error)
```

### 2. 配置管理模块 (ConfigManager)

```go
// internal/config/manager.go
type ConfigManager struct {
    authManager *AuthManager
}

type FrpConfig struct {
    ServerAddr string  `json:"server_addr"`
    ServerPort int     `json:"server_port"`
    AuthToken  string  `json:"token"`
    Proxies    []Proxy `json:"proxies"`
}

func (cm *ConfigManager) FetchConfig() (*FrpConfig, error)
func (cm *ConfigManager) SaveToLocal(config *FrpConfig) error
func (cm *ConfigManager) LoadFromLocal() (*FrpConfig, error)
```

### 3. 服务管理模块 (ServiceManager)

```go
// internal/service/manager.go
type ServiceManager struct {
    config  *FrpConfig
    running atomic.Bool
}

func (sm *ServiceManager) Start() error
func (sm *ServiceManager) Stop() error
func (sm *ServiceManager) Restart() error
func (sm *ServiceManager) GetStatus() string
func (sm *ServiceManager) GetProxies() []ProxyStatus
```

---

## 构建与发布

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发模式（热更新）
wails dev
```

### 生产构建

```bash
# 构建 Windows 64 位
wails build -o frp-client.exe

# 构建后使用 UPX 压缩（可选）
upx -9 frp-client.exe
```

### 依赖清单

#### Go 依赖 (go.mod)
```go
module frp-desktop-client

go 1.21

require (
    github.com/wails.io/wails/v2 v2.0.0
    github.com/fatedier/frp v0.50.0
    github.com/mattn/go-sqlite3 v1.14.0
    golang.org/x/sys/windows v0.15.0
)
```

#### 前端依赖 (package.json)
```json
{
  "name": "frp-desktop-client",
  "version": "1.0.0",
  "dependencies": {
    "vue": "^3.4.0",
    "ant-design-vue": "^4.0.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "@vueuse/core": "^10.0.0",
    "wails": "^2.0.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## 实施步骤

### Phase 1: 项目初始化 (1 天)
1. 初始化 Wails 项目
2. 配置 Vue 3 + Vite + Tailwind
3. 安装 Ant Design Vue

### Phase 2: UI 框架搭建 (2-3 天)
1. 实现登录页面 UI
2. 实现主面板 UI
3. 实现托盘功能
4. 实现深色/浅色主题切换

### Phase 3: 后端功能开发 (3-4 天)
1. 实现认证模块
2. 实现配置获取 API
3. 集成 frp 客户端
4. 实现本地存储

### Phase 4: 前后端联调 (2-3 天)
1. 登录鉴权联调
2. 配置同步联调
3. 服务启停联调
4. 日志实时展示

### Phase 5: 优化与测试 (2-3 天)
1. UI 动画优化
2. 异常处理
3. 打包测试
4. 代码签名

---

## 潜在问题与解决方案

| 问题 | 解决方案 |
|------|----------|
| frp 库版本兼容性 | 锁定 frp 版本，使用 go.mod 精确依赖 |
| Wails 打包体积 | 使用 UPX 压缩，优化前端代码分割 |
| 杀毒软件拦截 | 申请代码签名证书 |
| 深色主题适配 | Ant Design Vue 内置主题系统 |

---

## 时间估算

| 阶段 | 时间 |
|------|------|
| 项目初始化 | 1 天 |
| UI 框架搭建 | 2-3 天 |
| 后端功能开发 | 3-4 天 |
| 前后端联调 | 2-3 天 |
| 优化测试 | 2-3 天 |
| **总计** | **10-14 天** |

---

## 总结

技术组合：**Wails 2 + Vue 3 + Ant Design Vue + Tailwind CSS + Go**

优势：
- ✅ 单文件 EXE 执行，无需环境配置
- ✅ 现代化 UI 设计，视觉效果优秀
- ✅ 完整的前端技术栈，高度可定制
- ✅ Go 后端与 frp 原生兼容
- ✅ 支持托盘、开机自启等功能
