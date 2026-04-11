# LLM Gateway (大语言模型网关)

一个智能 API 网关，用于将 LLM（大语言模型）请求代理到后端推理服务（如 **Ollama** 或 **vLLM**）。它提供 API Key 管理、用户余额计费和集中式管理控制台。

## 🚀 核心特性

- **LLM 请求代理**：无缝地将 HTTP 请求转发到多个后端 LLM 实例。
- **多协议支持**：支持 **流式（SSE）** 和 **非流式** 聊天完成。
- **API Key 管理**：创建、管理和轮换 API Key，精细控制使用情况。
- **用户余额计费**：按用户账户统一管理余额，多个 API Key 共享同一账户余额。
- **双重认证机制**：
  - **JWT 认证**：用于用户面向的管理和仪表盘访问。
  - **API Key 认证**：用于轻量级、高性能的客户端 API 访问。
- **智能路由**：支持通过配置实现动态模型映射和后端 URL 重定向。
- **可观测性**：内置监控，支持请求统计、Token 使用趋势和系统健康状态。
- **管理控制台**：用户友好的 Web 界面（Thymeleaf），供管理员管理用户、Key 和监控系统状态。

## 🛠️ 技术栈

- **后端**: [Spring Boot 3.x](https://spring.io/projects/spring-boot), [Spring Security](https://spring.io/projects/spring-security), [Spring Data JPA](https://spring.io/projects/spring-data-jpa)
- **数据库**: [MySQL](https://www.mysql.com/)
- **前端**: [Thymeleaf](https://www.thymeleaf.org/) (服务端渲染), HTML5, CSS3, 原生 JavaScript
- **API 文档**: [SpringDoc / Swagger UI](https://springdoc.org/)
- **代理引擎**: [Spring WebClient](https://docs.spring.io/spring-framework/reference/web/webclient.html) (响应式/非阻塞)

## 📋 环境要求

- **Java 17+**
- **Maven 3.6+**
- **MySQL 8.0+**
- **Docker** (可选，用于容器化部署)

## 🚀 快速开始

### 1. 克隆仓库
```bash
git clone <repository-url>
cd llm-gateway
```

### 2. 配置数据库
更新 `src/main/resources/application.yml` 中的 MySQL 凭据：
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/llm_gateway?useSSL=false&serverTimezone=UTC&createDatabaseIfNotFound=true
    username: your_username
    password: your_password
```

### 3. 构建和运行
**使用 Maven:**
```bash
mvn clean package
java -jar target/llm-gateway-0.0.1-SNAPSHOT.jar
```

**使用 Docker Compose:**
```bash
docker-compose up -d
```

### 4. 访问应用
- **管理控制台**: http://localhost:8080/dashboard
- **API 文档 (Swagger)**: http://localhost:8080/swagger-ui.html
- **客户端 API 基础 URL**: `http://localhost:8080/api/llm/chat`

## 🔐 认证指南

### 用户认证 (管理控制台)
使用 `/login` 页面的标准登录表单，输入用户名和密码。用户将获得 **JWT token** 用于会话管理。

### API Key 认证 (客户端使用)
对于编程访问，在请求中包含 `X-API-Key` 头部：
```http
POST /api/llm/chat HTTP/1.1
Host: localhost:8080
X-API-Key: nkey_your_generated_api_key_here
Content-Type: application/json

{
  "model": "llama3",
  "messages": [{"role": "user", "content": "Hello!"}],
  "stream": false
}
```

## 🏗️ 架构概览

```text
[ 客户端 (Python/JS/Curl) ]
      |
      | (HTTP + X-API-Key)
      v
[ LLM Gateway (Spring Boot) ]
      |
      |-- [ 认证过滤器：API Key 检查 ]
      |-- [ 认证过滤器：JWT 检查 ]
      |-- [ 路由引擎：解析后端和模型 ]
      |-- [ 使用跟踪：检查和扣减 Token ]
      v
[ 后端 LLM 服务 (Ollama / vLLM) ]
```

## 📄 许可证
本项目采用 [MIT 许可证](LICENSE)。
