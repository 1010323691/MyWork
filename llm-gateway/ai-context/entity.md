# Entity 层文档

## 概述
Entity 层定义数据模型，使用 JPA 注解映射数据库表。包含基础实体和关联关系。

## 文件清单

| 文件 | 路径 | 数据库表 | 职责 |
|------|------|---------|------|
| User | `src/main/java/com/nexusai/llm/gateway/entity/User.java` | `users` | 用户信息（同时实现 UserDetails） |
| ApiKey | `src/main/java/com/nexusai/llm/gateway/entity/ApiKey.java` | `api_keys` | API Key 配置 |
| RequestLog | `src/main/java/com/nexusai/llm/gateway/entity/RequestLog.java` | `request_logs` | 请求日志记录 |
| BackendService | `src/main/java/com/nexusai/llm/gateway/entity/BackendService.java` | `backend_services` | 后端服务配置（预留） |

---

## User
**文件**: `src/main/java/com/nexusai/llm/gateway/entity/User.java`

### 数据库表：`users`

### 字段定义

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | Long | PK, Auto | 主键 |
| username | String | Unique, Not Null, Max 50 | 用户名 |
| password | String | Not Null | 密码（BCrypt 加密） |
| email | String | Not Null | 邮箱 |
| enabled | Boolean | Not Null, Default true | 启用状态 |
| user_role | String | Not Null, Max 20 | 角色（USER/ADMIN） |
| created_at | LocalDateTime | - | 创建时间 |
| updated_at | LocalDateTime | - | 更新时间 |

### 关联关系
- `@OneToMany(mappedBy = "user", cascade = ALL, orphanRemoval = true)` - 一对多关联 API Key

### 特殊实现
- **实现 `UserDetails` 接口** - Spring Security 认证
- `@PrePersist` / `@PreUpdate` - 自动设置时间戳

### 实现 UserDetails 方法
```java
getAuthorities() → ["ROLE_" + userRole]
getPassword() → password
getUsername() → username
isAccountNonExpired() → true
isAccountNonLocked() → true
isCredentialsNonExpired() → true
isEnabled() → enabled
```

### 使用场景
- 注册新用户
- 登录认证
- 用户权限判断
- 用户信息管理

---

## ApiKey
**文件**: `src/main/java/com/nexusai/llm/gateway/entity/ApiKey.java`

### 数据库表：`api_keys`

### 字段定义

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | Long | PK, Auto | 主键 |
| user_id | Long | FK, Not Null | 关联用户 ID |
| api_key | String | Unique, Not Null | API Key 值（nkey_ 前缀） |
| name | String | Not Null | Key 名称 |
| token_limit | Long | - | Token 限额（null=无限） |
| used_tokens | Long | Not Null, Default 0 | 已用 Token |
| enabled | Boolean | Not Null, Default true | 启用状态 |
| expires_at | LocalDateTime | - | 过期时间（null=永不过期） |
| created_at | LocalDateTime | - | 创建时间 |
| updated_at | LocalDateTime | - | 更新时间 |
| target_url | String | - | 后端 URL 配置 |
| routing_config | Text | - | 路由配置 JSON |
| last_used_at | LocalDateTime | - | 最后使用时间 |

### 关联关系
- `@ManyToOne(fetch = LAZY)` - 多对一关联 User

### 计算属性

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getRemainingTokens()` | Long | 剩余 Token（null=无限） |
| `useTokens(long count)` | void | 增加已用 Token |

### 计算逻辑
```java
remainingTokens = tokenLimit == null ? null : Math.max(0, tokenLimit - usedTokens)
```

### 使用场景
- 创建 API Key
- API Key 认证
- Token 配额检查
- Token 扣减
- Key 状态管理

---

## RequestLog
**文件**: `src/main/java/com/nexusai/llm/gateway/entity/RequestLog.java`

### 数据库表：`request_logs`

### 字段定义

| 字段 | 类型 | 约束 | 描述 |
|------|------|------|------|
| id | Long | PK, Auto | 主键 |
| api_key_id | Long | FK, Not Null | 关联 API Key |
| input_tokens | Long | - | 输入 Token 数 |
| output_tokens | Long | - | 输出 Token 数 |
| model_name | String | - | 使用的模型名称 |
| latency_ms | Long | - | 响应时间（毫秒） |
| status | String | Not Null, Max 10 | 状态（SUCCESS/FAIL） |
| request_body | Text | - | 请求内容（截断 2000 字符） |
| response_body | Text | - | 响应内容（截断 2000 字符） |
| created_at | LocalDateTime | - | 创建时间 |

### 关联关系
- `@ManyToOne(fetch = LAZY)` - 多对一关联 ApiKey

### 索引
```java
@Index(name = "idx_request_logs_api_key_id", columnList = "api_key_id")
@Index(name = "idx_request_logs_created_at", columnList = "created_at")
```

### 枚举类型
```java
public enum RequestStatus {
    SUCCESS,
    FAIL
}
```

### 使用场景
- 记录每次请求
- 日志查询
- Token 消耗统计
- 请求分析

---

## BackendService
**文件**: `src/main/java/com/nexusai/llm/gateway/entity/BackendService.java`

### 数据库表：`backend_services`

### 状态
- **预留实体** - 暂未使用
- 未来用于管理多个后端服务配置

---

## 关系图

```
┌─────────────────┐       1:N        ┌──────────────────┐
│     User        │ ───────────────► │      ApiKey      │
│ (users 表)       │                  │ (api_keys 表)     │
└─────────────────┘                  └────────┬─────────┘
                                              │
                                              │ 1:N
                                              │
                                    ┌─────────▼────────┐
                                    │   RequestLog     │
                                    │ (request_logs 表) │
                                    └──────────────────┘
```

---

## 修改数据库表

### 添加新字段
1. 在 Entity 类添加字段和 `@Column` 注解
2. 更新 Lombok `@Data` / `@Builder`
3. 运行 Flyway/Liquibase 迁移脚本（如果有）
4. 或手动执行 `ALTER TABLE`

### 修改关联关系
```java
// 一对一
@OneToOne
@JoinColumn(name = "xxx_id")

// 一对多
@OneToMany(mappedBy = "xxx", cascade = CascadeType.ALL, orphanRemoval = true)

// 多对一
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "xxx_id")

// 多对多
@ManyToMany
@JoinTable(...)
```

---

## 生命周期注解

### @PrePersist
- 在首次插入前执行
- 设置 `created_at`

### @PreUpdate
- 在更新前执行
- 设置 `updated_at`

### 示例
```java
@PrePersist
protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
}

@PreUpdate
protected void onUpdate() {
    updatedAt = LocalDateTime.now();
}
```

---

## 常见操作

### 创建用户
```java
User user = User.builder()
    .username("test")
    .password(BCrypt.encode("password"))
    .email("test@example.com")
    .userRole("USER")
    .build();
userRepository.save(user);
```

### 创建 API Key
```java
User user = new User();
user.setId(userId);

ApiKey key = ApiKey.builder()
    .user(user)
    .apiKeyValue("nkey_xxx")
    .name("My Key")
    .tokenLimit(1000000L)
    .enabled(true)
    .build();
apiKeyRepository.save(key);
```

### 查询用户及其 Keys
```java
User user = userRepository.findById(id).orElse(null);
if (user != null) {
    List<ApiKey> keys = user.getApiKeys(); // 懒加载触发
}
```

---

## 修改定位指南

| 问题类型 | 优先查看文件 | 原因 |
|----------|-------------|-----|
| 实体属性不对 | 检查 `@Column` 注解 | 字段名、类型、约束 |
| 关联查询为空 | 检查 `@ManyToOne` / `@OneToMany` | 关联方向、懒加载 |
| 时间戳不对 | 检查 `@PrePersist` / `@PreUpdate` | 自动更新时间 |
| 保存失败 | 检查唯一约束、非空约束 | `Unique`、`Not Null` |
| 添加新字段 | Entity + 数据库迁移 | 同步修改 |
