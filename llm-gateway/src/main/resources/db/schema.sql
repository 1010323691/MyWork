-- LLM Gateway 数据库建表语句
-- MySQL 8.0+

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '用户 ID',
    `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    `password` VARCHAR(255) NOT NULL COMMENT '密码 (BCrypt 加密)',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `role` VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT '角色：USER/ADMIN',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_username (`username`),
    INDEX idx_email (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- API 密钥表
CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'ID',
    `user_id` BIGINT NOT NULL COMMENT '关联用户 ID',
    `key` VARCHAR(255) NOT NULL UNIQUE COMMENT 'API 密钥',
    `name` VARCHAR(255) NOT NULL COMMENT '密钥名称',
    `token_limit` BIGINT COMMENT 'Token 限额 (NULL 表示无限制)',
    `used_tokens` BIGINT NOT NULL DEFAULT 0 COMMENT '已使用 Token 数',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `expires_at` DATETIME COMMENT '过期时间',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_key (`key`),
    INDEX idx_user_id (`user_id`),
    CONSTRAINT fk_apikeys_user FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API 密钥表';

-- 后端服务配置表
CREATE TABLE IF NOT EXISTS `backend_services` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'ID',
    `name` VARCHAR(255) NOT NULL COMMENT '服务名称',
    `base_url` VARCHAR(500) NOT NULL COMMENT '基础 URL',
    `service_type` VARCHAR(20) NOT NULL DEFAULT 'OLLAMA' COMMENT '服务类型：OLLAMA/VLLM',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    `timeout_seconds` INT NOT NULL DEFAULT 300 COMMENT '超时时间 (秒)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_service_type (`service_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后端服务配置表';
