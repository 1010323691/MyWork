# LLM Gateway 生产部署指南

这份文档按当前项目代码整理，目标是最少步骤完成 Linux 云服务器上线。

适用场景：

- Spring Boot 网关部署在 Linux 云服务器
- MySQL 部署在同一台服务器
- 上游 LM 服务部署在内网其他机器，例如 `http://192.168.0.119:1234`
- 外部访问通过 Nginx 反向代理

当前项目关键默认行为：

- 生产环境使用 `SPRING_PROFILES_ACTIVE=prod`
- 生产环境默认关闭 Swagger
- 生产环境默认只暴露 `/actuator/health` 和 `/actuator/info`
- 旧接口 `/api/llm/chat` 不支持流式，流式请使用 `/v1/chat/completions`
- CORS 白名单通过环境变量 `APP_SECURITY_ALLOWED_ORIGIN_PATTERNS` 配置
- 转发超时、模型发现超时、熔断阈值、异步线程池都支持环境变量覆盖

---

## 1. 准备服务器

以下命令以 Ubuntu/Debian 为例：

```bash
apt update
apt install -y openjdk-17-jdk maven mysql-server nginx curl
```

确认环境：

```bash
java -version
mvn -version
mysql --version
nginx -v
```

---

## 2. 初始化 MySQL

登录 MySQL：

```bash
mysql -u root -p
```

执行：

```sql
CREATE DATABASE llm_gateway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'llm_gateway'@'localhost' IDENTIFIED BY '替换成强密码';
GRANT ALL PRIVILEGES ON llm_gateway.* TO 'llm_gateway'@'localhost';
FLUSH PRIVILEGES;
```

退出：

```sql
EXIT;
```

---

## 3. 上传并构建项目

假设部署目录为 `/opt/llm-gateway`：

```bash
cd /opt
git clone <你的仓库地址> llm-gateway
cd /opt/llm-gateway
mvn clean package
```

构建成功后，Jar 一般位于：

```bash
/opt/llm-gateway/target/llm-gateway-0.0.1-SNAPSHOT.jar
```

---

## 4. 明确你的生产参数

上线前先确认这几个值：

- 数据库地址：`jdbc:mysql://127.0.0.1:3306/llm_gateway?useSSL=false&serverTimezone=UTC`
- 数据库用户名：`llm_gateway`
- 数据库密码：你刚才创建的密码
- 网关默认上游地址：例如 `http://192.168.0.119:1234`
- 对外访问域名：例如 `api.example.com`
- 允许跨域来源：例如 `https://admin.example.com`

说明：

- `GATEWAY_DEFAULT_BACKEND_URL` 是兜底上游地址
- 更推荐你在后台 provider 或 API key 里显式配置目标地址和模型路由
- 如果生产环境前后端同域名，CORS 可以留空或只写一个正式域名

---

## 5. 创建运行用户

不要用 `root` 直接跑 Java 服务：

```bash
useradd -r -s /usr/sbin/nologin llm-gateway
chown -R llm-gateway:llm-gateway /opt/llm-gateway
```

---

## 6. 配置 systemd 服务

创建文件：

```bash
nano /etc/systemd/system/llm-gateway.service
```

填入下面内容，并替换里面的域名、密码、上游地址：

```ini
[Unit]
Description=LLM Gateway Service
After=network.target mysql.service
Wants=network.target

[Service]
Type=simple
User=llm-gateway
Group=llm-gateway
WorkingDirectory=/opt/llm-gateway

Environment=SPRING_PROFILES_ACTIVE=prod
Environment=DB_URL=jdbc:mysql://127.0.0.1:3306/llm_gateway?useSSL=false&serverTimezone=UTC
Environment=DB_USERNAME=llm_gateway
Environment=DB_PASSWORD=替换成强密码
Environment=GATEWAY_DEFAULT_BACKEND_URL=http://192.168.0.119:1234
Environment=APP_SECURITY_ALLOWED_ORIGIN_PATTERNS=https://admin.example.com,https://api.example.com
Environment=GATEWAY_FORWARD_CONNECT_TIMEOUT_SECONDS=30
Environment=GATEWAY_FORWARD_READ_TIMEOUT_SECONDS=300
Environment=GATEWAY_FORWARD_MAX_IN_MEMORY_SIZE_BYTES=16777216
Environment=GATEWAY_UPSTREAM_CIRCUIT_FAILURE_THRESHOLD=5
Environment=GATEWAY_UPSTREAM_CIRCUIT_RESET_MINUTES=5
Environment=GATEWAY_UPSTREAM_CONNECTIVITY_TIMEOUT_SECONDS=5
Environment=GATEWAY_UPSTREAM_MODEL_DISCOVERY_TIMEOUT_SECONDS=30
Environment=GATEWAY_ASYNC_REQUEST_TIMEOUT_MS=300000
Environment=GATEWAY_ASYNC_EXECUTOR_CORE_POOL_SIZE=8
Environment=GATEWAY_ASYNC_EXECUTOR_MAX_POOL_SIZE=32
Environment=GATEWAY_ASYNC_EXECUTOR_QUEUE_CAPACITY=200

ExecStart=/usr/bin/java -jar /opt/llm-gateway/target/llm-gateway-0.0.1-SNAPSHOT.jar
SuccessExitStatus=143
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

加载并启动：

```bash
systemctl daemon-reload
systemctl enable llm-gateway
systemctl start llm-gateway
systemctl status llm-gateway
```

查看实时日志：

```bash
journalctl -u llm-gateway -f
```

---

## 7. 先在本机验证 Spring Boot

先确认应用本身没问题，再上 Nginx：

```bash
curl http://127.0.0.1:8080/actuator/health
curl http://127.0.0.1:8080/actuator/info
```

如果服务正常，`health` 应返回 `UP`。

如果这里失败，先不要继续看 Nginx，优先查：

- `journalctl -u llm-gateway -f`
- MySQL 账号密码是否正确
- `GATEWAY_DEFAULT_BACKEND_URL` 是否能从云服务器访问到

例如测试云服务器到内网 LM 机器连通性：

```bash
curl http://192.168.0.119:1234/v1/models
```

如果这一步不通，说明不是网关问题，而是网络连通性问题。

---

## 8. 配置 Nginx

创建站点配置：

```bash
nano /etc/nginx/sites-available/llm-gateway
```

写入以下内容，并替换域名：

```nginx
server {
    listen 80;
    server_name api.example.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

启用站点：

```bash
ln -s /etc/nginx/sites-available/llm-gateway /etc/nginx/sites-enabled/llm-gateway
nginx -t
systemctl reload nginx
```

然后测试：

```bash
curl http://127.0.0.1
curl http://api.example.com/actuator/health
```

---

## 9. 配置 HTTPS

安装证书工具：

```bash
apt install -y certbot python3-certbot-nginx
```

签发证书：

```bash
certbot --nginx -d api.example.com
```

证书完成后，再验证：

```bash
curl https://api.example.com/actuator/health
```

---

## 10. 初始化管理员账号

当前系统没有自动种子数据的话，可以手工插入管理员。

先生成一个 BCrypt 密码。下面示例中的哈希对应明文 `admin123`，只用于首次登录，登录后必须立刻修改。

登录数据库：

```bash
mysql -u llm_gateway -p llm_gateway
```

插入管理员：

```sql
INSERT INTO users (username, password, email, enabled, user_role, created_at, updated_at)
VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb375NOiPeQJkUQVQh7VVdZ3Vy1PmTlVl5U3s6u0W', 'admin@example.com', TRUE, 'ADMIN', NOW(), NOW());
```

---

## 11. 上线后的最小验证清单

按顺序检查：

1. `systemctl status llm-gateway` 正常
2. `curl http://127.0.0.1:8080/actuator/health` 返回 `UP`
3. `curl https://api.example.com/actuator/health` 返回 `UP`
4. 管理后台能正常登录
5. 新建 provider 后，能成功探测模型
6. 用 API key 调 `/v1/models` 正常
7. 用 API key 调 `/v1/chat/completions` 非流式正常
8. 用 API key 调 `/v1/chat/completions` 流式正常

---

## 12. 常见问题排查

### 1. 服务启动失败

先看日志：

```bash
journalctl -u llm-gateway -n 200 --no-pager
```

常见原因：

- MySQL 用户名或密码错误
- `prod` 环境下 `ddl-auto=validate`，但表结构还没建好
- 云服务器访问不到上游 LM 地址
- `ExecStart` 指向的 Jar 路径不对

### 2. 数据库结构校验失败

当前生产环境默认：

```yaml
spring.jpa.hibernate.ddl-auto=validate
```

这意味着表必须已经存在并匹配实体。

如果是第一次部署，你有两种办法：

- 临时把 `JPA_DDL_AUTO=update` 加到服务环境变量里，启动成功建表后再改回 `validate`
- 或者先用你自己的 SQL 初始化库结构

如果你要走最简单路径，第一次部署建议临时这样改：

```ini
Environment=JPA_DDL_AUTO=update
```

第一次启动成功后，把它删掉，再：

```bash
systemctl daemon-reload
systemctl restart llm-gateway
```

### 3. 云服务器调不到内网 LM

如果你在云服务器上执行：

```bash
curl http://192.168.0.119:1234/v1/models
```

失败了，说明：

- 云服务器和内网机器不通
- 没有 VPN / 专线 / 内网穿透
- 本地 LM 服务只监听了 `127.0.0.1`
- 防火墙没放行

这种情况必须先解决网络链路，网关本身改代码没用。

### 4. 前端跨域失败

检查 `APP_SECURITY_ALLOWED_ORIGIN_PATTERNS` 是否包含真实来源，例如：

```bash
https://admin.example.com,https://api.example.com
```

注意：

- 多个来源用英文逗号分隔
- 协议要带上，`https://` 不能省略
- 如果你是不同端口，也要写完整来源

### 5. 流式接口不返回

确认你调用的是：

```text
/v1/chat/completions
```

不要用旧接口：

```text
/api/llm/chat
```

旧接口当前不支持流式。

---

## 13. 推荐的首次上线顺序

建议你严格按这个顺序做：

1. 本机 `mvn clean package`
2. 服务器安装 Java、MySQL、Nginx
3. 建库建账号
4. 上传代码并构建
5. 配 systemd 环境变量
6. 启动 Spring Boot
7. 先测 `127.0.0.1:8080/actuator/health`
8. 再配 Nginx
9. 再配 HTTPS
10. 再建管理员
11. 最后测真实 API 转发

---

## 14. 你这套环境的最小示例

如果按你当前信息，最关键的两个值大概是：

```ini
Environment=GATEWAY_DEFAULT_BACKEND_URL=http://192.168.0.119:1234
Environment=APP_SECURITY_ALLOWED_ORIGIN_PATTERNS=https://你的管理后台域名
```

如果你管理后台和网关就是同一个域名，也可以先写：

```ini
Environment=APP_SECURITY_ALLOWED_ORIGIN_PATTERNS=https://你的域名
```
