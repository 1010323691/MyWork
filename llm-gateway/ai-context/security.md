# Security 层 - 安全认证

## 模块概览
Spring Security 配置和双认证机制（JWT + API Key）。

---

## 文件清单

### 1. `SecurityConfig.java`
**职责**: Spring Security 核心配置

**关键配置**:

| 配置项 | 说明 |
|-----|-----|
| `SecurityFilterChain` | 安全过滤器链配置 |
| `corsConfigurationSource()` | CORS 跨域配置 |
| `daoAuthenticationProvider()` | DAO 认证提供者 |
| `passwordEncoder()` | BCrypt 密码编码器 |
| `authenticationManager()` | 认证管理器 |

**过滤器顺序**:
1. `ApiKeyAuthenticationFilter` - 优先检查 API Key
2. `JwtAuthenticationFilter` - 然后检查 JWT Token

**路径权限规则**:

| 路径 | 权限 |
|-----|-----|
| /api/auth/** | 公开（登录注册） |
| /swagger-ui/** | 公开 |
| /api/clients/** | 需认证（API Key） |
| /api/llm/** | 需认证（API Key） |
| /api/admin/** | 需 ADMIN 角色（JWT） |
| /dashboard | 公开（但前端需要认证） |

---

### 2. `JwtAuthenticationFilter.java`
**职责**: JWT Token 认证过滤器

**核心逻辑**:
```
1. 检查是否在 skipPaths（跳过路径）
2. 从 Authorization header 提取 Bearer Token
3. 使用 JwtService 验证 Token
4. 加载 UserDetails 并设置 SecurityContext
5. 放行请求
```

**跳过路径**:
- `/api/auth/**` - 登录注册
- `/api/clients/**` - 客户端 API
- `/api/llm/**` - LLM 转发
- `/swagger-ui/**` - API 文档

**依赖**: `JwtService`, `UserDetailsService`

---

### 3. `ApiKeyAuthenticationFilter.java`
**职责**: API Key 认证过滤器

**核心逻辑**:
```
1. 检查是否在 skipPaths（跳过路径）
2. 从 X-API-Key header 提取 API Key
3. 验证格式（必须以 nkey_ 开头）
4. 查询 ApiKeyService 获取 API Key 信息
5. 检查是否启用、是否过期
6. 创建 API_USER 权限并设置 SecurityContext
7. 将 ApiKey 存储到 request 属性
8. 放行请求
```

**跳过路径**（由 SecurityConfig 注入）:
- `/api/auth/**` - 登录注册
- `/swagger-ui/**` - API 文档
- `/dashboard` - 管理后台
- `/login` - 登录页

**依赖**: `ApiKeyService`, `ObjectMapper`

---

### 4. `JwtService.java`
**职责**: JWT Token 生成和验证

**配置参数**:
```yaml
jwt.secret: your-256-bit-secret-key-for-jwt-generation-must-be-long-enough
jwt.expiration: 86400000  # 24 小时
```

**核心方法**:
| 方法 | 说明 |
|-----|-----|
| `generateToken(userDetails)` | 生成 JWT |
| `extractUsername(token)` | 提取用户名 |
| `isTokenValid(token, userDetails)` | 验证 Token |

---

### 5. `ApiKeyService.java`
**职责**: API Key 管理

**核心方法**:
| 方法 | 说明 |
|-----|-----|
| `findByKey(key)` | 查找 API Key |
| `createApiKey(...)` | 创建 API Key |
| `generateKey()` | 生成 nkey_XXX 格式 Key |
| `hasEnoughTokens()` | 检查 Token 余额 |

---

### 6. `CustomUserDetailsService.java`
**职责**: 加载用户详情（Spring Security 接口）

**核心方法**:
| 方法 | 说明 |
|-----|-----|
| `loadUserByUsername(username)` | 从数据库加载 User |

---

## 认证流程

### JWT 认证流程（Web 管理后台）

```
1. 用户访问 /dashboard
   ↓
2. ViewController.dashboardPage() 检查认证
   ↓
3. 未认证 → 重定向到 /login
   ↓
4. 用户登录 → AuthController.login()
   ↓
5. AuthenticationManager 验证用户名密码
   ↓
6. JwtService.generateToken() 生成 JWT
   ↓
7. 前端保存 JWT 到 localStorage
   ↓
8. 后续请求携带 Bearer Token
   ↓
9. JwtAuthenticationFilter 验证 Token
   ↓
10. SecurityContextHolder 设置认证信息
```

### API Key 认证流程（客户端/LLM 转发）

```
1. 客户端请求 /api/llm/chat 或 /api/clients/token-usage
   ↓
2. 携带 X-API-Key: nkey_XXX header
   ↓
3. ApiKeyAuthenticationFilter 拦截
   ↓
4. 验证 Key 格式（nkey_ 开头）
   ↓
5. ApiKeyService.findByKey() 查询数据库
   ↓
6. 检查 enabled 和 expiresAt
   ↓
7. 创建 API_USER 权限
   ↓
8. SecurityContextHolder 设置认证信息
   ↓
9. 请求继续处理
```

---

## 权限矩阵

| 用户类型 | 认证方式 | /api/admin/** | /api/llm/** | /api/clients/** | /dashboard |
|---------|---------|--------------|-------------|-----------------|-----------|
| 未认证 | - | ❌ | ❌ | ❌ | ✅(重定向) |
| USER | JWT | ❌ | ✅ | ✅ | ✅ |
| ADMIN | JWT | ✅ | ✅ | ✅ | ✅ |
| API_USER | API Key | ❌ | ✅ | ✅ | ❌ |

---

## 修改影响

| 修改文件 | 影响范围 |
|---------|--------|
| SecurityConfig | 所有路径权限、过滤器配置 |
| JwtAuthenticationFilter | JWT 认证逻辑 |
| ApiKeyAuthenticationFilter | API Key 认证逻辑 |
| JwtService | JWT Token 生成和验证 |
| ApiKeyService | API Key 生成和验证 |

---

## 注意事项（重要）

1. **JWT 密钥**: 生产环境必须修改 `jwt.secret` 默认值
2. **过滤器顺序**: ApiKeyFilter 在 JwtFilter 之前，优先检查 API Key
3. **路径匹配**: 使用 AntPathMatcher 风格的 `/**` 通配符
4. **CORS 配置**: 当前允许所有源（*），生产环境应限制来源
5. **API Key 格式**: 必须 `nkey_` 开头，否则被拒绝
6. **权限检查**: 使用 `@PreAuthorize` 或 `SecurityContextHolder` 获取当前用户角色
