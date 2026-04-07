# LLM Gateway - 部署指南

## Linux 服务器部署

### 1. 环境准备

```bash
# 安装 JDK 17
apt update
apt install openjdk-17-jdk -y

# 安装 Maven
apt install maven -y

# 安装 MySQL
apt install mysql-server -y

# 验证安装
java -version
mvn -version
mysql --version
```

### 2. 配置 MySQL

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库和用户
CREATE DATABASE llm_gateway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'llm_gateway'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON llm_gateway.* TO 'llm_gateway'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. 克隆并配置项目

```bash
# 克隆项目
cd /opt
git clone <repository-url> llm-gateway
cd llm-gateway

# 修改配置文件
nano src/main/resources/application.yml
```

修改后的 `application.yml`:

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/llm_gateway?useSSL=false&serverTimezone=UTC
    username: llm_gateway
    password: your_strong_password
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false

jwt:
  secret: change-this-to-a-random-256-bit-secret-key-in-production
  expiration: 86400000
```

### 4. 构建项目

```bash
mvn clean package -DskipTests
```

### 5. 创建启动脚本

```bash
nano /opt/llm-gateway/start.sh
```

```bash
#!/bin/bash

APP_DIR=/opt/llm-gateway
APP_NAME=llm-gateway
LOG_FILE=$APP_DIR/app.log

cd $APP_DIR

# 停止旧实例
if [ -f $APP_DIR/app.pid ]; then
    kill $(cat $APP_DIR/app.pid) 2>/dev/null
    rm $APP_DIR/app.pid
fi

# 启动新实例
nohup java -jar target/llm-gateway-0.0.1-SNAPSHOT.jar > $LOG_FILE 2>&1 &
echo $! > $APP_DIR/app.pid

echo "$APP_NAME started with PID $(cat $APP_DIR/app.pid)"
```

```bash
chmod +x /opt/llm-gateway/start.sh
```

### 6. 创建系统服务

```bash
nano /etc/systemd/system/llm-gateway.service
```

```ini
[Unit]
Description=LLM Gateway Service
After=syslog.target network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/llm-gateway
ExecStart=/usr/bin/java -jar target/llm-gateway-0.0.1-SNAPSHOT.jar
ExecStop=/bin/kill -15 $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 重载配置
systemctl daemon-reload

# 启动服务
systemctl start llm-gateway

# 设置开机自启
systemctl enable llm-gateway

# 查看状态
systemctl status llm-gateway
```

### 7. 配置防火墙

```bash
# 开放端口
ufw allow 8080/tcp
ufw reload
```

### 8. 创建初始管理员

```bash
# 登录 MySQL
mysql -u llm_gateway -p llm_gateway

# 插入初始管理员 (密码需要先 BCrypt 加密)
# 默认密码：admin123 (请修改！)
INSERT INTO users (username, password, email, enabled, created_at, updated_at)
VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb375NOiPeQJkUQVQh7VVdZ3Vy1PmTlVl5U3s6u0W', 'admin@example.com', TRUE, NOW(), NOW());
```

## 使用 Nginx 反向代理

### 1. 安装 Nginx

```bash
apt install nginx -y
```

### 2. 配置 Nginx

```bash
nano /etc/nginx/sites-available/llm-gateway
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 启用配置
ln -s /etc/nginx/sites-available/llm-gateway /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 3. 配置 HTTPS (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

## 监控和日志

### 查看日志

```bash
# 查看服务日志
journalctl -u llm-gateway -f

# 查看应用日志
tail -f /opt/llm-gateway/app.log
```

### 健康检查

```bash
# 检查服务状态
curl http://localhost:8080/actuator/health

# 检查指标
curl http://localhost:8080/actuator/metrics
```

## 备份和恢复

### 备份数据库

```bash
mysqldump -u llm_gateway -p llm_gateway > /backup/llm-gateway-$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
mysql -u llm_gateway -p llm_gateway < /backup/llm-gateway-20240101.sql
```

## 常见问题

### Q: 如何重置管理员密码？

```sql
-- 登录 MySQL
UPDATE users SET password='$2a$10$N.zmdr9k7uOCQb375NOiPeQJkUQVQh7VVdZ3Vy1PmTlVl5U3s6u0W' WHERE username='admin';
-- 密码：admin123
```

### Q: 如何查看 API Key？

访问管理后台：http://your-server:8080，登录后在 API Key 管理页面查看

### Q: 如何增加 Token 配额？

在管理后台创建新的 API Key 时设置 `tokenLimit` 参数，或直接在数据库更新：

```sql
UPDATE api_keys SET token_limit = 10000000 WHERE id = 1;
```
