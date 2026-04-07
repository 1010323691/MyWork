# Risk - 潜在风险点和注意事项

## 模块概览
项目中的已知风险、技术债务和改进建议。

---

## 安全风险 ⚠️

### 1. JWT 密钥未修改
**文件**: `application.yml`, `JwtService.java`
**风险**: 使用默认密钥，生产环境易被破解
**建议**: 部署时通过环境变量注入强密钥

```bash
# 生成强密钥
openssl rand -base64 32
# 部署时使用
docker run -e JWT_SECRET=<generated-secret> llm-gateway
```

---

### 2. CORS 允许所有源
**文件**: `SecurityConfig.java`
**风险**: `configuration.setAllowedOrigins(Collections.singletonList("*"))` 允许所有跨域请求
**建议**: 生产环境限制特定域名

```java
configuration.setAllowedOrigins(Arrays.asList("https://your-domain.com"));
```

---

### 3. 密码哈希强度
**文件**: `SecurityConfig.java`
**现状**: BCrypt 默认强度（log rounds = 10）
**建议**: 根据需求调整强度，但更高强度会增加登录延迟

---

### 4. SQL 注入防护
**现状**: 使用 JPA/Hibernate，已自动防护
**注意**: 避免使用原生查询（`@Query(nativeQuery = true)`）拼接用户输入

---

### 5. XSS 防护不足
**文件**: `dashboard.html`, `dashboard.js`
**风险**: Thymeleaf 默认转义，但部分地方使用 `th:inline="javascript"` 可能引入 XSS
**建议**: 
- 所有用户输入到前端必须转义
- `dashboard.js` 的 `escapeHtml()` 应在所有输出点使用

---

## 性能风险 ⚠️

### 1. 流式转发内存问题
**文件**: `LlmForwardService.java`
**问题**: `forwardStreaming()` 将全部流数据存入 StringBuilder
**风险**: 大响应可能导致内存溢出
**建议**: 改用 SSE (Server-Sent Events) 或 WebSocket 实时推送

---

### 2. 数据库 N+1 查询
**文件**: `ApiKeyController.java`
**问题**: 加载 ApiKey 列表后，逐个访问 `apiKey.getUser()` 可能触发 N+1 查询
**建议**: 使用 JOIN FETCH

```java
@Query("SELECT ak FROM ApiKey ak JOIN FETCH ak.user WHERE ak.user.id = :userId")
List<ApiKey> findByUserIdWithUser(@Param("userId") Long userId);
```

---

### 3. JWT 未设置 Refresh Token
**现状**: JWT 过期后需重新登录
**建议**: 实现 Refresh Token 机制

---

### 4. 无请求限流
**风险**: 恶意请求可能耗尽资源
**建议**: 添加 Spring Security 限流或 Redis 限流

---

## 功能缺陷 ⚠️

### 1. Token 使用量未实际记录
**文件**: `LlmController.java`
**现状**: 
```java
// 这里可以记录 token 使用情况
// llmForwardService.recordUsage(key, estimatedTokens);
```
**问题**: 代码已注释，Token 使用量未更新
**建议**: 解析响应内容，调用 `estimateTokenUsage()` 并更新数据库

---

### 2. BackendService 实体未使用
**文件**: `BackendService.java`, `BackendServiceRepository.java`
**现状**: 定义了后端服务配置实体，但代码中未实际使用
**问题**: 硬编码默认后端 URL `http://localhost:11434`
**建议**: 从数据库读取配置的 BackendService

---

### 3. 用户角色硬编码
**文件**: `User.java`
**现状**: 角色在创建时硬编码为 USER 或 ADMIN
**建议**: 创建管理员初始化脚本或数据库种子数据

---

### 4. 无 API 版本控制
**现状**: 所有 API 直接 `/api/...`
**建议**: 添加版本号 `/api/v1/...` 便于未来升级

---

## 数据一致性问题 ⚠️

### 1. Token 配额无事务保护
**文件**: `ApiKeyService.java`
**问题**: 多并发请求可能导致 Token 扣减不一致
**建议**: 使用乐观锁或分布式锁

```java
@Column(name = "version")
private Long version;  // 添加版本字段
```

---

### 2. 过期 API Key 未自动禁用
**文件**: `ApiKey.java`
**现状**: 有 `expiresAt` 字段，但不会自动禁用
**建议**: 添加定时任务清理过期 API Key

---

## 部署风险 ⚠️

### 1. MySQL 连接池未配置
**现状**: 使用默认连接池
**建议**: 生产环境配置连接池参数

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000
```

---

### 2. 无健康检查端点
**现状**: 仅有 `/actuator/health`
**建议**: 添加数据库连接健康检查、后端服务可达性检查

---

### 3. 日志泄露敏感信息
**文件**: `LlmForwardService.java`, `ApiKeyController.java`
**问题**: 日志可能打印 API Key 或请求内容
**建议**: 脱敏处理

```java
logger.info("API Key: {}", key.substring(0, 8) + "****");
```

---

## 代码质量 ⚠️

### 1. 魔法值（Magic Numbers）
**文件**: 多处
**示例**: `16 * 1024 * 1024` (16MB)
**建议**: 提取为常量

```java
private static final int MAX_REQUEST_SIZE = 16 * 1024 * 1024;
```

---

### 2. 异常处理粗糙
**文件**: 多处
**现状**: 捕获 `Exception` 并抛 `RuntimeException`
**建议**: 定义自定义异常类

```java
public class ApiKeyNotFoundException extends RuntimeException { ... }
public class TokenLimitExceededException extends RuntimeException { ... }
```

---

### 3. 硬编码 URL
**文件**: `LlmForwardService.java`
**现状**: `http://localhost:11434` 硬编码
**建议**: 从配置或数据库读取

---

## 改进优先级

| 优先级 | 问题 | 影响 | 难度 |
|-------|-----|-----|-----|
| 🔴 高 | JWT 密钥未修改 | 安全风险 | 低 |
| 🔴 高 | Token 使用量未记录 | 功能缺陷 | 中 |
| 🟡 中 | CORS 允许所有源 | 安全风险 | 低 |
| 🟡 中 | 流式转发内存问题 | 性能风险 | 高 |
| 🟢 低 | N+1 查询 | 性能风险 | 中 |
| 🟢 低 | 无 API 版本控制 | 架构缺陷 | 低 |

---

## 安全加固清单

- [ ] 修改 `jwt.secret` 默认值
- [ ] 限制 CORS 允许的源
- [ ] 添加 API Key 脱敏日志
- [ ] 实现 Refresh Token
- [ ] 添加请求限流
- [ ] 添加 CSRF 保护（对于状态修改操作）
- [ ] 启用 HTTPS
- [ ] 配置数据库连接池

---

## 技术债务清单

- [ ] 实现 Token 使用量记录
- [ ] 从数据库读取 BackendService
- [ ] 添加 API 版本控制
- [ ] 改进异常处理
- [ ] 添加单元测试
- [ ] 添加集成测试
- [ ] 代码重构（提取常量、消除魔法值）
