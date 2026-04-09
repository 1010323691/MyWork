# Security 模块文档（安全认证）

## 模块职责

实现双模式认证：**Session/Cookie 认证**（网页登录）和 **API Key 认证**（程序调用）。包含密码加密、CORS 配置等。

---

## 安全组件列表

### 1. SecurityConfig (安全配置) ⭐核心

**文件路径**: `src/main/java/com/nexusai/llm/gateway/security/SecurityConfig.java`

**关键配置**:
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity  // 启用@PreAuthorize 注解
public class SecurityConfig {
    
    // Session 认证：启用会话支持，CSRF 禁用（JSON API 无需 CSRF）
    .csrf(csrf -> csrf.disable())
    .sessionManagement(session -> session
        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
    
    // 退出登录配置
    .logout(logout -> logout
        .logoutUrl("/logout")
        .invalidateHttpSession(true)
        .deleteCookies("JSESSIONID"))
}
```

**权限映射**:
| URL 路径 | 所需权限 |
|---------|----------|
| `/api/auth/**` (login/register) | 公开访问 |
| `/api/admin/**` | ROLE_ADMIN |
| `/api/user/**` | 已认证用户 |
| `/api/llm/**` | API Key 或 Session |

---

### 2. ApiKeyAuthenticationFilter (API Key 过滤器) ⭐核心

**文件路径**: `src/main/java/com/nexusai/llm/gateway/security/ApiKeyAuthenticationFilter.java`

**职责**: 识别并验证 HTTP 请求头中的 `X-API-Key`，设置 SecurityContext

**认证流程**:
```
1. 检查是否命中 skipPaths（如/login, /api/auth/**）→ 跳过
2. 读取请求头 X-API-Key（以 nkey_开头）→ 无则跳过交给 Session 认证
3. 调用 ApiKeyService.findByKeyNoCache() 查询数据库
4. 验证状态：enabled? expiresAt > now?
5. 创建 UsernamePasswordAuthenticationToken，设置 SecurityContext
6. 将 ApiKey 对象存入 request.setAttribute("apiKey", key)
```

**错误响应**:
| 状态码 | 原因 |
|--------|------|
| 401 | Invalid API key |
| 403 | API key is disabled |
| 403 | API key has expired |

---

### 3. CustomUserDetailsService (用户详情服务)

**文件路径**: `src/main/java/com/nexusai/llm/gateway/security/CustomUserDetailsService.java`

**职责**: Spring Security 的 UserDetailsService 实现，从数据库加载用户信息

```java
public UserDetails loadUserByUsername(String username) {
    return userRepository.findByUsername(username)
        .orElseThrow(() -> new UsernameNotFoundException("User not found"));
}
```

---

### 4. BCryptPasswordEncoder (密码加密器)

**职责**: 对用户密码进行 BCrypt 哈希加密（在 SecurityConfig 中作为 Bean 提供）

**特点**:
- 单向不可逆
- 内置 salt，相同密码生成不同 hash

---

## 双认证模式对比

| 特性 | Session/Cookie 认证 | API Key 认证 |
|------|---------------------|-------------|
| **使用场景** | Web 浏览器登录 | 程序调用 LLM API |
| **认证方式** | 用户名/密码 → 表单登录 | X-API-Key 请求头 |
| **会话保持** | JSESSIONID Cookie（HttpSession） | 无状态（每次携带 Key） |
| **核心组件** | DaoAuthenticationProvider + HttpSessionSecurityContextRepository | ApiKeyAuthenticationFilter |
| **权限控制** | USER / ADMIN | API_USER (固定) |

---

## Session/Cookie 认证流程详解

```
1. 用户提交登录表单 → POST /api/auth/login
2. AuthController.login():
   - AuthenticationManager.authenticate() 验证用户名密码
   - SecurityContextHolder.createEmptyContext() 创建安全上下文
   - HttpSessionSecurityContextRepository.saveContext() 存入 Session
3. Spring 自动设置 JSESSIONID Cookie（HttpOnly）
4. 后续请求自动携带 Cookie → SecurityContextPersistenceFilter 恢复认证状态
```

---

## CORS 配置

**允许的源**: `http://localhost:8080`, `http://127.0.0.1:8080`  
**允许的方法**: GET, POST, PUT, DELETE, OPTIONS  
**允许的头**: Authorization, Content-Type, X-API-Key  
**暴露的头**: X-Remaining-Tokens, X-Total-Tokens  
**允许凭证**: true（启用 Cookie 跨域）

---

## 修改指引

| 需求 | 修改位置 |
|------|----------|
| 添加新的公开路径 | SecurityConfig 的 `authorizeHttpRequests` + apiKeyFilter.setSkipPaths() |
| 更换密码加密算法 | SecurityConfig.passwordEncoder() Bean |
| 增加权限角色 | User.userRole + SecurityConfig.hasRole() |
| 调整 Session 超时时间 | application.yml → server.servlet.session.timeout |
