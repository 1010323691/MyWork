# 发现与决策

## 需求
重构认证模块，实现纯 Token（JWT）认证，移除 session 和重定向逻辑。

---

## 研究发现

### 现有架构问题

#### 1. 混合认证方式
```
SecurityConfig.java:
  - sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    → 已禁用 session 创建
    
  - 但 AuthController.login() 使用 AuthenticationManager.authenticate()
    → 这会设置 SecurityContext，本质上是认证但非 session
```

**问题**：虽然配置了 STATELESS，但 AuthenticationManager 的使用方式让人困惑，容易与 session 混淆。

---

#### 2. ViewController 的重定向逻辑
```java
// ViewController.java (推测)
@GetMapping("/dashboard")
public String dashboardPage() {
    // 可能检查认证状态并返回不同视图
}
```

**问题**：后端不应该负责认证检查后的重定向，这应该由前端 JS 处理。

---

#### 3. 登录响应字段过多
```java
// AuthController.java:59-65
response.put("token", jwtToken);
response.put("username", user.getUsername());
response.put("email", user.getEmail());
response.put("expiresIn", Duration.ofMillis(86400000).toSeconds());
```

**问题**：token 本身包含所有信息（username、roles、exp），额外字段冗余。

---

### 技术细节发现

#### JwtService 分析
```java
// JwtService.java:29-38
public String generateToken(Map<String, Object> claims, UserDetails userDetails) {
    claims.put("authorities", userDetails.getAuthorities().stream()...);
    claims.put("userId", ((User) userDetails).getId());
    // ...
}
```
**发现**：JWT 中已包含 userId、authorities，前端可以从 JWT 解码获取，无需后端额外返回。

---

#### JwtAuthenticationFilter 分析
```java
// JwtAuthenticationFilter.java:30-47
skipPaths 包括：
- /api/auth/**      → 登录注册
- /api/clients/**   → 客户端 API（使用 API Key）
- /api/llm/**       → LLM 转发（使用 API Key）
- /dashboard        → 未看到
- /login            → 登录页
```

**发现**：`/dashboard` 不在 skipPaths 中，理论上会被 JWT 过滤器检查，但没有 token 时会直接放行（不会拒绝，只是不设置认证信息）。

---

#### SecurityFilterChain 路径权限
```java
// SecurityConfig.java:84
.requestMatchers("/dashboard").permitAll()  // 页面允许访问
```

**发现**：dashboard 页面是 permitAll 的，真正的权限控制应该在 Controller 层面。

---

### ApiKey 认证分析

**现状**：
```java
// ApiKeyAuthenticationFilter.java:53-55
if (apiKey == null || !apiKey.startsWith("nkey_")) {
    filterChain.doFilter(request, response);  // 跳过，让 JWT filter 处理
    return;
}
```

**发现**：API Key 过滤器没有 API Key 时会继续放行，由 JWT 过滤器处理。这种设计是正确的，允许两种认证方式并存。

---

## 技术决策

| 决策 | 理由 |
|------|------|
| 保留 AuthenticationManager | 用于登录时验证用户名密码，与 session 无关 |
| 简化登录响应为只返回 token | JWT 包含所有必要信息，前端可解码 |
| 移除 ViewController 中的认证检查 | 由前端 JS 统一处理 |
| 保留 API Key 认证完整不变 | 不影响，只重构用户登录部分 |
| dashboard 页面 permitAll | 保持现状，由前端检查 token |

---

## 遇到的问题

| 问题 | 解决方案 |
|------|----------|
| SecurityConfig 配置了 STATELESS 但感觉还有 session 逻辑 | 验证：STATELESS 已正确配置，问题在于 ViewController 的混用 |
| JWT 过滤器对没有 token 的请求怎么处理？ | 直接放行，不设置 SecurityContext，后续 Controller 的@PreAuthorize 会拒绝 |
| 前端如何获取用户角色？ | 从 JWT 解码或使用 Thymeleaf 传递（首次加载） |

---

## 资源
- JWT 规范：https://jwt.io/
- Spring Security Stateless：https://docs.spring.io/spring-security/reference/servlet/configuration/httpsession.html

---

## 视觉/浏览器发现
（本任务无多模态内容）

---

## 核心问题总结

**为什么感觉混乱？**

现有代码实际上是**正确的**，但有以下问题让人困惑：

1. **AuthenticationManager 的使用**：它的名字让人联想到"设置认证 session"，但实际上在 STATELESS 模式下只是验证凭据
2. **ViewController 的混合**：Thymeleaf 服务端渲染 + AJAX，容易混用服务端和客户端认证检查
3. **权限控制的层次**：SecurityFilterChain 的 `permitAll()` 和 Controller 的 `@AuthenticationPrincipal` 混合使用

**解决方案**：
- 明确区分：后端负责**认证验证**，前端负责**认证检查后的行为**
- 后端统一返回 401，前端统一处理跳转到登录
