# LLM Gateway - API 网关项目

## 项目简介

LLM Gateway 是一个用于部署在 Linux 服务器上的 API 网关程序，通过 HTTP 转发将用户请求路由到本地 LLM 服务（如 Ollama 或 vLLM）。

### 系统架构

```
用户 → 云服务器 (API 网关)
         ↓
      HTTP 转发
         ↓
   本地 Ollama / vLLM
```

## 功能特性

- ✅ API Key 管理和认证
- ✅ Token 配额管理
- ✅ JWT 用户认证
- ✅ Vue 可视化后台
- ✅ HTTP 请求转发到 LLM 服务
- ✅ 客户端 Token 余量查询 API

## 技术栈

- **后端**: Spring Boot 3.x, Spring Security, Spring Data JPA
- **数据库**: MySQL
- **前端**: Thymeleaf 模板引擎
- **认证**: JWT + API Key
- **权限**: Spring Security 基于角色的访问控制 (ADMIN/USER)
- **页面渲染**: 服务端渲染 (后端模板)

## 快速开始

### 环境要求

- JDK 17+
- MySQL 5.7+
- Maven 3.6+

### 1. 克隆项目

```bash
git clone <repository-url>
cd llm-gateway
```

### 2. 配置数据库

修改 `src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/llm_gateway?useSSL=false&serverTimezone=UTC&createDatabaseIfNotFound=true
    username: your_username
    password: your_password
```

### 3. 构建并运行

```bash
# 本地运行
mvn spring-boot:run

# 或者打包运行
mvn clean package
java -jar target/llm-gateway-0.0.1-SNAPSHOT.jar
```

### 4. 访问应用

- 登录页面：http://localhost:8080/login
- 管理后台：http://localhost:8080/dashboard
- API 文档：http://localhost:8080/swagger-ui.html

## 创建初始管理员

首次运行后，需要手动在数据库中创建管理员账户：

```sql
INSERT INTO llm_gateway.users (username, password, email, enabled, user_role, created_at, updated_at)
VALUES ('admin', '$2a$10$XXX...', 'admin@example.com', TRUE, 'ADMIN', NOW(), NOW());
```

> 注意：密码需要使用 BCrypt 编码。可以使用在线工具或运行以下 Java 代码生成:
> ```java
> BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
> System.out.println(encoder.encode("your_password"));
> ```

## API 文档

### 认证 API

#### POST /api/auth/login
用户登录

**请求体:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "admin",
  "email": "admin@example.com",
  "expiresIn": 86400
}
```

#### POST /api/auth/register
用户注册

**请求体:**
```json
{
  "username": "newuser",
  "password": "encrypted_password",
  "email": "user@example.com"
}
```

### API Key 管理

#### GET /api/admin/apikeys
获取当前用户的所有 API Key

**Header:** `Authorization: Bearer <token>`

#### POST /api/admin/apikeys
创建新的 API Key

**请求体:**
```json
{
  "name": "Production Key",
  "tokenLimit": 1000000,
  "expiresAtDays": 30
}
```

#### DELETE /api/admin/apikeys/{id}
删除 API Key

#### PUT /api/admin/apikeys/{id}/toggle
启用/禁用 API Key

### 客户端 API

#### GET /api/clients/token-usage
查询 Token 余量

**Header:** `X-API-Key: nkey_...`

**响应:**
```json
{
  "totalTokens": 1000000,
  "usedTokens": 150000,
  "remainingTokens": 850000,
  "apiKeyName": "Production Key",
  "hasLimit": true
}
```

### LLM 转发 API

#### POST /api/llm/chat
发送聊天请求到 LLM 服务

**Header:** `X-API-Key: nkey_...`

**请求体:**
```json
{
  "model": "llama2",
  "messages": "[{\"role\":\"user\",\"content\":\"Hello\"}]",
  "stream": false,
  "backendUrl": "http://localhost:11434"
}
```

## Docker 部署

### 1. 构建镜像

```bash
docker build -t llm-gateway .
```

### 2. 运行容器

```bash
docker run -d \
  -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/llm_gateway \
  -e SPRING_DATASOURCE_USERNAME=root \
  -e SPRING_DATASOURCE_PASSWORD=password \
  --name llm-gateway \
  llm-gateway
```

### 3. Docker Compose

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: llm_gateway
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  llm-gateway:
    build: .
    depends_on:
      - mysql
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/llm_gateway
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: root
    ports:
      - "8080:8080"

volumes:
  mysql_data:
```

## 配置说明

### application.yml 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| server.port | 服务端口 | 8080 |
| spring.datasource.url | 数据库连接 URL | - |
| spring.datasource.username | 数据库用户名 | - |
| spring.datasource.password | 数据库密码 | - |
| jwt.secret | JWT 密钥 | 默认值（生产环境需修改）|
| jwt.expiration | JWT 过期时间 (毫秒) | 86400000 (24 小时) |

## 安全建议

1. **修改 JWT 密钥**: 在生产环境中，务必修改 `jwt.secret` 配置
2. **使用强密码**: 用户密码应使用 BCrypt 加密
3. **配置 HTTPS**: 生产环境应配置 HTTPS
4. **限制 API Key**: 为 API Key 设置合理的 Token 配额和过期时间

## 故障排查

### 数据库连接失败

检查数据库是否运行，用户名密码是否正确：

```bash
mysql -h localhost -u root -p
```

### 应用启动失败

查看日志：

```bash
java -jar target/llm-gateway-0.0.1-SNAPSHOT.jar --debug
```

### API Key 无法使用

1. 检查 API Key 是否已启用
2. 检查是否过期
3. 检查 Token 配额是否充足

## 许可证

MIT License
