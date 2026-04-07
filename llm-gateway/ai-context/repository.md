# Repository 层 - 数据访问

## 模块概览
Spring Data JPA Repository 接口，负责数据库操作。

## 文件清单

### 1. `UserRepository.java`
**表**: `users`

| 方法 | 说明 |
|-----|-----|
| `findByUsername(username)` | 通过用户名查找用户 |
| `existsByUsername(username)` | 检查用户名是否存在 |
| `existsByEmail(email)` | 检查邮箱是否存在 |

**继承**: `JpaRepository<User, Long>`（提供标准 CRUD）

---

### 2. `ApiKeyRepository.java`
**表**: `api_keys`

| 方法 | 说明 |
|-----|-----|
| `findByKey(key)` | 通过 Key 查找 |
| `findByUserId(userId)` | 查找指定用户的所有 API Keys |
| `findByEnabled(enabled)` | 查找启用/禁用的 API Keys |
| `existsByKey(key)` | 检查 Key 是否存在 |

**继承**: `JpaRepository<ApiKey, Long>`

---

### 3. `BackendServiceRepository.java`
**表**: `backend_services`

**继承**: `JpaRepository<BackendService, Long>`

**说明**: 当前项目未实现自定义查询方法，仅使用基础 CRUD

---

## Entity 关联关系

```
User (1) ────── (N) ApiKey
    ├─ id
    ├─ username (唯一)
    ├─ password (BCrypt 加密)
    ├─ email (唯一)
    ├─ enabled
    └─ role (USER/ADMIN)

ApiKey
    ├─ id
    ├─ user_id (FK → User.id)
    ├─ key (唯一，格式 nkey_XXX)
    ├─ name
    ├─ token_limit (可为 null 表示无限制)
    ├─ used_tokens
    ├─ enabled
    └─ expires_at (可为 null 表示永不过期)

BackendService
    ├─ id
    ├─ name
    ├─ base_url
    ├─ service_type (OLLAMA/VLLM)
    ├─ enabled
    └─ timeout_seconds
```

---

## 数据库表结构

### users
```sql
id              BIGINT PRIMARY KEY AUTO_INCREMENT
username        VARCHAR(50) UNIQUE NOT NULL
password        VARCHAR(255) NOT NULL
email           VARCHAR(255) NOT NULL
enabled         BOOLEAN DEFAULT TRUE
role            VARCHAR(20) DEFAULT 'USER'
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### api_keys
```sql
id              BIGINT PRIMARY KEY AUTO_INCREMENT
user_id         BIGINT NOT NULL, FK → users.id
key             VARCHAR(255) UNIQUE NOT NULL
name            VARCHAR(255) NOT NULL
token_limit     BIGINT (可 NULL)
used_tokens     BIGINT DEFAULT 0
enabled         BOOLEAN DEFAULT TRUE
expires_at      TIMESTAMP (可 NULL)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### backend_services
```sql
id              BIGINT PRIMARY KEY AUTO_INCREMENT
name            VARCHAR(255) NOT NULL
base_url        VARCHAR(255) NOT NULL
service_type    VARCHAR(20) DEFAULT 'OLLAMA'
enabled         BOOLEAN DEFAULT TRUE
timeout_seconds INT DEFAULT 300
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

---

## 修改影响

| 修改文件 | 影响范围 |
|---------|--------|
| UserRepository | 用户登录、注册、查询 |
| ApiKeyRepository | API Key 的增删改查 |
| BackendServiceRepository | 后端服务配置管理 |

---

## 注意事项

1. **实体关系**: User 和 ApiKey 是一对多关系，级联删除 (`cascade = ALL, orphanRemoval = true`)
2. **唯一约束**: username、email、key 字段都有唯一约束
3. **自动时间戳**: 所有实体都有 `@PrePersist` 和 `@PreUpdate` 自动更新时间字段
4. **BackendService**: 当前未在代码中实际使用，仅定义了实体
