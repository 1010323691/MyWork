# Security 层文档

## 概述
Security 层负责认证和授权，采用 Spring Security 框架。支持双重认证模式：Session/Cookie 认证（Web 页面）和 API Key 认证（API 调用）。

## 文件清单

| 文件 | 路径 | 职责 |
|------|------|------|
| SecurityConfig | `src/main/java/com/nexusai/llm/gateway/security/SecurityConfig.java` | 安全配置（认证、授权、CORS） |
| ApiKeyAuthenticationFilter | `src/main/java/com/nexusai/llm/gateway/security/ApiKeyAuthenticationFilter.java` | API Key 认证过滤器 |
| CustomUserDetailsService | `src/main/java/com/nexusai/llm/gateway/security/CustomUserDetailsService.java` | 用户详情服务（Session 认证） |
| ApiKeyService | `src/main/java/com/nexusai/llm/gateway/security/ApiKeyService.java` | API Key 服务 |
| JwtService | `src/main/java/com/nexusai/llm/gateway/security/JwtService.java` | JWT 服务（预留） |
| JwtAuthenticationFilter | `src/main/java/com/nexusai/llm/gateway/security/JwtAuthenticationFilter.java` | JWT 认证过滤器（预留） |

---

## SecurityConfig
**文件**: `src/main/java/com/nexusai/llm/gateway/security/SecurityConfig.java`

### 职责
配置 Spring Security 的认证、授权、CORS 策略。

### 认证模式
- **Session/Cookie**: Web 页面使用，通过表单登录创建 Session
- **API Key**: API 调用使用，通过 `X-API-Key` 请求头传递

### 关键配置

#### 1. CORS 配置
```java
cors.configurationSource(corsConfigurationSource())
```
- 允许所有源：`*`
- 允许方法：GET, POST, PUT, DELETE, OPTIONS
- 允许头：Authorization, Content-Type, X-API-Key
- 暴露头：X-Remaining-Tokens, X-Total-Tokens

#### 2. CSRF 禁用
```java
csrf.disable()
```
原因：
- 登录表单使用 Cookie，CSRF 防护不适用于 JSON API
- API 调用使用 API Key，本身具有 CSRF 防护效果

#### 3. Session 管理
```java
sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
```
- 按需创建 Session
- 支持无状态 API 调用

#### 4. 表单登录配置
```java
formLogin(form -> form
    .loginProcessingUrl("/login")
    .successHandler(successAuthenticationHandler())
    .failureUrl("/login?error")
    .usernameParameter("username")
    .passwordParameter("password")
    .permitAll())
```

#### 5. 退出登录配置
```java
logout(logout -> logout
    .logoutUrl("/logout")
    .logoutSuccessUrl("/login?logout")
    .invalidateHttpSession(true)
    .deleteCookies("JSESSIONID"))
```

#### 6. 路径权限配置
```java
authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/login").permitAll()
    .requestMatchers("/api/auth/register").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers("/api/user/**").authenticated()
    .requestMatchers("/api/llm/**").authenticated()
    .anyRequest().permitAll())
```

#### 7. 过滤器链
```java
.addFilterBefore(apiKeyAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
```
- ApiKey 过滤器在表单登录过滤器之前执行
- 优先处理 API Key 认证

### 权限矩阵

| 路径 | 公开 | 用户 | 管理员 |
|------|------|------|--------|
| /api/auth/login | ✓ | ✓ | ✓ |
| /api/auth/register | ✓ | ✓ | ✓ |
| /api/auth/me | - | ✓ | ✓ |
| /api/user/** | - | ✓ | ✓ |
| /api/admin/** | - | ✗ | ✓ |
| /api/llm/** | - | ✓ | ✓ |
| /api/clients/** | - | ✓ | ✓ |
| /dashboard | - | ✓ | ✓ |
| /admin/** | - | ✗ | ✓ |

---

## ApiKeyAuthenticationFilter
**文件**: `src/main/java/com/nexusai/llm/gateway/security/ApiKeyAuthenticationFilter.java`

### 职责
处理 API Key 认证，从请求头提取 Key 并验证。

### 执行顺序
- 在 `UsernamePasswordAuthenticationFilter` 之前执行
- 优先处理 API Key 认证

### 认证流程
```
1. 检查是否跳过路径（配置在 SecurityConfig）
2. 读取 X-API-Key 请求头
3. 检查前缀是否为 "nkey_"
4. 调用 ApiKeyService.findByKeyNoCache() 查找 Key
5. 检查 Key 是否启用、未过期
6. 创建 SecurityContext（角色：API_USER）
7. 设置 request attribute "apiKey"
8. 继续过滤器链
```

### 跳过路径
配置在 SecurityConfig 构造函数中：
```java
apiKeyAuthenticationFilter.setSkipPaths(List.of(
    "/api/auth/**",
    "/v3/api-docs/**",
    "/swagger-ui/**",
    "/actuator/**",
    ...
));
```

### 错误处理
- **401 Unauthorized**: Key 不存在
- **403 Forbidden**: Key 禁用或过期

### SecurityContext 设置
```java
User principal = new User(
    key.getId().toString(),  // 主键 ID
    "",                       // 空密码
    Collections.singletonList(new SimpleGrantedAuthority("API_USER"))
);
SecurityContextHolder.getContext().setAuthentication(authentication);
```

### Request Attribute
```java
request.setAttribute("apiKey", key);
```
- 供 Controller 层获取完整的 ApiKey 实体
- 用于 Token 检查和日志记录

---

## CustomUserDetailsService
**文件**: `src/main/java/com/nexusai/llm/gateway/security/CustomUserDetailsService.java`

### 职责
实现 `UserDetailsService` 接口，用于 Session 认证。

### 方法
```java
loadUserByUsername(String username)
```

### 流程
1. 调用 `UserRepository.findByUsername(username)`
2. 如果用户不存在，抛出 `UsernameNotFoundException`
3. 返回 User 实体（实现了 UserDetails）

### User 实现 UserDetails
- `getAuthorities()` → 返回 `["ROLE_" + userRole]`
- `isEnabled()` → 返回 `user.enabled`
- 其他方法默认返回 true

---

## ApiKeyService
**文件**: `src/main/java/com/nexusai/llm/gateway/security/ApiKeyService.java`

### 职责
API Key 的业务逻辑处理。

### 关键方法
- `findByKey()` - 查找 Key
- `createApiKey()` - 创建 Key
- `hasEnoughTokens()` - 检查 Token
- `recordUsage()` - 记录使用
- `generateKey()` - 生成随机 Key

### Key 生成算法
```java
byte[] randomBytes = new byte[32];
RANDOM.nextBytes(randomBytes);
return "nkey_" + Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
```
- 32 字节随机数
- Base64 URL 编码
- 前缀：`nkey_`

---

## 认证流程图

### Session 认证（Web 页面）
```
浏览器访问 /login
    ↓
表单提交 POST /login (username + password)
    ↓
SecurityFilterChain
    ↓
ApiKeyAuthenticationFilter（跳过，无 X-API-Key）
    ↓
UsernamePasswordAuthenticationFilter
    ↓
DaoAuthenticationProvider
    ↓
CustomUserDetailsService.loadUserByUsername()
    ↓
BCryptPasswordEncoder 验证密码
    ↓
创建 Session，设置 JSESSIONID Cookie
    ↓
重定向到 /dashboard
    ↓
后续请求携带 Cookie → 自动认证
```

### API Key 认证（API 调用）
```
客户端发送请求 + X-API-Key: nkey_xxx
    ↓
SecurityFilterChain
    ↓
ApiKeyAuthenticationFilter
    ↓
ApiKeyService.findByKeyNoCache()
    ↓
检查 Key 启用状态、过期时间
    ↓
创建 SecurityContext (角色：API_USER)
    ↓
设置 request.setAttribute("apiKey", key)
    ↓
后续过滤器继续处理
    ↓
Controller 从 request 获取 ApiKey 实体
```

### 混合认证（用户访问）
- **Session 认证**: 从 SecurityContext 获取 User 实体
- **API Key 认证**: 从 request attribute 获取 ApiKey 实体
- **统一获取用户 ID**:
```java
ApiKey apiKey = (ApiKey) request.getAttribute("apiKey");
if (apiKey != null) {
    return apiKey.getUser().getId();
}
if (authentication.getPrincipal() instanceof User) {
    return ((User) authentication.getPrincipal()).getId();
}
```

---

## 权限控制

### 注解方式
```java
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<...> adminOperation() {
    // 仅管理员可访问
}
```

### 配置方式
```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .requestMatchers("/api/user/**").authenticated()
    ...)
```

### 角色定义
- `ROLE_USER` - 普通用户（默认）
- `ROLE_ADMIN` - 管理员
- `API_USER` - API Key 认证（临时角色）

---

## 常见问题

### 1. API Key 认证不生效
- 检查过滤器顺序：ApiKeyAuthenticationFilter 应在 UsernamePasswordAuthenticationFilter 之前
- 检查 X-API-Key 请求头是否正确设置
- 检查 Key 前缀是否为 `nkey_`

### 2. Session 认证失效
- 检查 Cookie 是否正确设置
- 检查 Session 超时配置
- 检查 logout 是否销毁 Session

### 3. 权限 403
- 检查角色配置：`hasRole('ADMIN')` 需要 `ROLE_ADMIN`
- 检查路径匹配顺序：更具体的路径应放在前面

### 4. CORS 错误
- 检查 AllowedOrigins 配置
- 检查 AllowedHeaders 是否包含 `X-API-Key`
- 检查允许凭证配置

---

## 修改定位指南

| 问题类型 | 优先查看文件 | 关键配置 |
|----------|-------------|------|
| 认证失败 | ApiKeyAuthenticationFilter / CustomUserDetailsService | 认证逻辑 |
| 权限错误 | SecurityConfig | authorizeHttpRequests |
| CORS 问题 | SecurityConfig.corsConfigurationSource() | 允许源、方法、头 |
| Session 失效 | SecurityConfig.sessionManagement() | Session 策略 |
| 过滤器顺序 | SecurityConfig.securityFilterChain() | addFilterBefore |
| 添加新角色 | SecurityConfig + Entity.User | hasRole() |
| API Key 生成 | ApiKeyService.generateKey() | 随机算法 |
