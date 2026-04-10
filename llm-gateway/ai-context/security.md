# Security 安全模块说明

## 概述

Security 层基于 Spring Security 构建，支持两种认证模式：Session/Cookie（Web 页面）和 API Key（API 调用）。使用 BCrypt 密码加密、方法级权限控制 (`@PreAuthorize`) 以及 CORS 配置。

---

## 核心组件

### 1. SecurityConfig
**路径**: `security/SecurityConfig.java`  
**职责**: Spring Security 全局配置（过滤器链、认证提供者、CORS）

#### SecurityFilterChain 配置要点
| 配置项 | 设置 | 说明 |
|--------|------|------|
| CSRF | disable() | 禁用 CSRF（JSON API 场景） |
| Session Creation | IF_REQUIRED | 需要时创建 Session（支持无状态 API） |
| Form Login | disable() | 禁用默认登录页，使用自定义 `/api/auth/login` |
| Logout | `/logout` | 退出后重定向到 `/login?logout` |

#### 路径权限规则
| 路径模式 | 权限要求 | 说明 |
|----------|----------|------|
| /api/auth/register, /api/auth/login | permitAll() | 公开注册/登录接口 |
| /api/admin/** | hasRole('ADMIN') | 管理员专用接口 |
| /api/user/**, /api/llm/** | authenticated() | 需要认证（Session 或 API Key） |
| /admin/** | hasRole('ADMIN') | 管理员页面路由 |
| /dashboard, /logs | authenticated() | 用户页面需登录 |
| /, /login, /register | permitAll() | 公开页面 |

#### CORS 配置
```java
allowedOriginPatterns: [
  "http://localhost:*",
  "http://127.0.0.1:*",
  "http://192.168.*:*",
  "http://10.*:*",
  "http://172.16.*:*" ~ "http://172.31.*:*"
]
allowedMethods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
allowedHeaders: [Authorization, Content-Type, X-API-Key, X-Requested-With]
allowCredentials: true
```

- 所有预检请求 `OPTIONS /**` 显式放行，便于本地前端在不同端口或局域网 IP 下调试。

---

### 2. ApiKeyAuthenticationFilter
**路径**: `security/ApiKeyAuthenticationFilter.java`  
**职责**: API Key 认证过滤器（继承 OncePerRequestFilter）

#### 过滤流程
1. **跳过检查**：匹配 skipPaths 配置的路径直接放行
2. **提取 Header**：从请求头获取 `X-API-Key`
3. **格式校验**：Key 值需以 `nkey_` 开头，否则跳过（交由 Session 认证处理）
4. **查找验证**：调用 ApiKeyService.findByKeyNoCache()
5. **状态检查**：验证 enabled 和 expiresAt 字段
6. **构建认证对象**：创建 UsernamePasswordAuthenticationToken，设置 SecurityContext
7. **附加信息**：将 ApiKey 实体存入 request.setAttribute("apiKey")

#### Skip Paths（跳过的路径）
- /api/auth/**, /swagger-ui/**, /v3/api-docs/**
- /actuator/**, /css/**, /js/**, /images/**
- /login, /register, /

---

### 3. ApiKeyService
**路径**: `security/ApiKeyService.java`  
**职责**: API Key 业务操作（生成、查询、配额检查）

| 方法 | 说明 |
|------|------|
| findByKey(apiKeyValue) | 查找 ApiKey 实体 |
| createApiKey(...) | 创建新 Key，生成 `nkey_` + Base64(32 字节随机数) |
| hasEnoughTokens(key, required) | 配额检查：无限制或剩余≥所需 |

---

### 4. CustomUserDetailsService
**路径**: `security/CustomUserDetailsService.java`  
**职责**: Spring Security UserDetailsService 实现

- 根据用户名查找 User 实体
- User 本身已实现 UserDetails 接口，直接返回即可

---

## 认证流程对比

### Session/Cookie 模式（Web 页面）
```
1. 用户提交登录表单 → /api/auth/login (POST)
2. AuthController.login() → AuthenticationManager.authenticate()
3. CustomUserDetailsService.loadUserByUsername() → User实体
4. SecurityConfig.saveContext() → 创建Session，设置JSESSIONID Cookie
5. 后续请求携带Cookie → Spring Security自动恢复认证状态
6. @AuthenticationPrincipal UserDetails / Authentication获取当前用户
```

### API Key 模式（API 调用）
```
1. 客户端发送请求，Header: X-API-Key: nkey_xxx
2. ApiKeyAuthenticationFilter.doFilterInternal() 拦截
3. ApiKeyService.findByKeyNoCache(key) → ApiKey实体
4. 验证 enabled / expiresAt 状态
5. SecurityContextHolder.setAuthentication(authToken)
6. request.setAttribute("apiKey", key) 供下游使用
```

---

## 权限控制方法注解

| 注解 | 示例 | 说明 |
|------|------|------|
| @PreAuthorize('hasRole("ADMIN")') | AdminController 所有方法 | 需要 ADMIN 角色 |
| @AuthenticationPrincipal UserDetails | ApiKeyController.listApiKeys() | 获取当前认证用户 |

---

## 密码加密

- **算法**: BCrypt（PasswordEncoder Bean）
- **存储**: User.password 字段存储加密后的字符串
- **验证**: DaoAuthenticationProvider 自动调用 passwordEncoder.matches()

---

## 常见修改定位

| 问题类型 | 优先检查文件 |
|----------|--------------|
| Session 登录失效 | SecurityConfig.securityFilterChain() sessionManagement 配置 |
| API Key 认证失败 | ApiKeyAuthenticationFilter.doFilterInternal() 跳过路径逻辑 |
| CORS 跨域错误 | SecurityConfig.corsConfigurationSource() allowedOrigins 配置 |
| 权限不足返回 403 | Controller 方法的 @PreAuthorize 注解与用户角色匹配关系 |
