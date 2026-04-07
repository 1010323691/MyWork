# Config - 配置和启动

## 模块概览
应用配置、启动类和依赖管理。

---

## 文件清单

### 1. `LlmGatewayApplication.java`
**职责**: Spring Boot 启动类

```java
@SpringBootApplication
public class LlmGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(LlmGatewayApplication.class, args);
    }
}
```

**注解说明**:
- `@SpringBootApplication` = `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan`

---

### 2. `application.yml`
**职责**: 主配置文件

#### server 配置
```yaml
server:
  port: 8080
```

#### 数据库配置
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/llm_gateway?useSSL=false&serverTimezone=UTC&createDatabaseIfNotFound=true
    username: root
    password: root
    driver-class-name: com.mysql.cj.jdbc.Driver
```

#### JPA 配置
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update        # 自动更新表结构
    show-sql: true           # 显示 SQL 日志
    properties:
      hibernate:
        format_sql: true     # SQL 格式化
```

#### Thymeleaf 配置
```yaml
spring:
  thymeleaf:
    mode: HTML
    prefix: classpath:/templates/
    suffix: .html
    cache: false            # 开发环境关闭缓存
```

#### JWT 配置
```yaml
jwt:
  secret: your-256-bit-secret-key-for-jwt-generation-must-be-long-enough-change-in-production
  expiration: 86400000     # 24 小时
```

#### 日志配置
```yaml
logging:
  level:
    com.nexusai.llm.gateway: DEBUG
    org.springframework.security: DEBUG
```

#### Actuator 配置
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
```

---

### 3. `pom.xml`
**职责**: Maven 依赖管理

#### 项目信息
```xml
<groupId>com.nexusai</groupId>
<artifactId>llm-gateway</artifactId>
<version>0.0.1-SNAPSHOT</version>
<java.version>17</java.version>
```

#### 核心依赖

| 依赖 | 用途 |
|-----|-----|
| spring-boot-starter-web | Web MVC |
| spring-boot-starter-webflux | Reactor WebClient |
| spring-boot-starter-validation | 参数校验 |
| spring-boot-starter-actuator | 监控端点 |
| spring-boot-starter-thymeleaf | 模板引擎 |
| spring-boot-starter-data-jpa | JPA |
| mysql-connector-j | MySQL 驱动 |
| springdoc-openapi-starter-webmvc-ui | Swagger UI |

#### JWT 依赖
```xml
<jjwt.version>0.12.3</jjwt.version>
jjwt-api, jjwt-impl, jjwt-jackson
```

#### Lombok
```xml
<groupId>org.projectlombok</groupId>
<artifactId>lombok</artifactId>
<optional>true</optional>
```

---

### 4. `Dockerfile`
**职责**: Docker 镜像构建

```dockerfile
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY target/llm-gateway-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 配置优先级

Spring Boot 配置加载顺序（从高到低）：

1. 环境变量 / 系统属性
2. `application.yml`
3. `application.properties`（如果存在）

**Docker 环境变量覆盖示例**:
```bash
docker run -e SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/llm_gateway \
           -e SPRING_DATASOURCE_USERNAME=root \
           -e SPRING_DATASOURCE_PASSWORD=root \
           llm-gateway
```

---

## 修改影响

| 修改文件 | 影响范围 |
|---------|--------|
| LlmGatewayApplication | 应用启动 |
| application.yml | 所有运行时配置 |
| pom.xml | 编译依赖，需重新打包 |
| Dockerfile | Docker 镜像构建 |

---

## 注意事项

1. **JWT 密钥**: 生产环境必须修改 `jwt.secret`
2. **数据库配置**: 生产环境应使用环境变量覆盖
3. **JPA DDL Auto**: 生产环境应改为 `validate`
4. **Thymeleaf 缓存**: 生产环境应开启 `cache: true`
5. **日志级别**: 生产环境应调整为 `INFO` 或 `WARN`
6. **端口配置**: Docker 部署时映射端口可能不同

---

## 启动方式

### 本地开发
```bash
mvn spring-boot:run
```

### 打包运行
```bash
mvn clean package
java -jar target/llm-gateway-0.0.1-SNAPSHOT.jar
```

### Docker 运行
```bash
docker build -t llm-gateway .
docker run -p 8080:8080 llm-gateway
```

---

## 健康检查端点

```bash
curl http://localhost:8080/actuator/health     # 健康状态
curl http://localhost:8080/actuator/info       # 应用信息
curl http://localhost:8080/actuator/metrics    # 指标数据
```
