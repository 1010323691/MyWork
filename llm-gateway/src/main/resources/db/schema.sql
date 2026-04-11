-- LLM Gateway schema
-- MySQL 8.0+

CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `user_role` VARCHAR(20) NOT NULL DEFAULT 'USER',
    `balance` DECIMAL(18,8) NOT NULL DEFAULT 0,
    `version` BIGINT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_username` (`username`),
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `api_key` VARCHAR(255) NOT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL,
    `used_tokens` BIGINT NOT NULL DEFAULT 0,
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `expires_at` DATETIME NULL,
    `target_url` VARCHAR(1000) NULL,
    `routing_config` TEXT NULL,
    `last_used_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_api_key` (`api_key`),
    INDEX `idx_api_keys_user_id` (`user_id`),
    CONSTRAINT `fk_apikeys_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `backend_services` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `base_url` VARCHAR(500) NOT NULL,
    `supported_models` VARCHAR(1000) NULL,
    `service_type` VARCHAR(20) NOT NULL DEFAULT 'OLLAMA',
    `enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `timeout_seconds` INT NOT NULL DEFAULT 300,
    `upstream_key` VARCHAR(512) NULL,
    `buy_price_input` DECIMAL(18,6) NULL,
    `sell_price_input` DECIMAL(18,6) NULL,
    `buy_price_output` DECIMAL(18,6) NULL,
    `sell_price_output` DECIMAL(18,6) NULL,
    `failure_count` INT NULL,
    `last_failure_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_service_type` (`service_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `request_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `api_key_id` BIGINT NOT NULL,
    `request_id` VARCHAR(64) NULL,
    `user_id` BIGINT NULL,
    `input_tokens` BIGINT NOT NULL DEFAULT 0,
    `output_tokens` BIGINT NOT NULL DEFAULT 0,
    `model_name` VARCHAR(255) NULL,
    `latency_ms` BIGINT NULL,
    `cost_amount` DECIMAL(18,8) NULL,
    `status` VARCHAR(10) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_request_logs_api_key_id` (`api_key_id`),
    INDEX `idx_request_logs_created_at` (`created_at`),
    INDEX `idx_request_log_user_id` (`user_id`),
    INDEX `idx_request_log_request_id` (`request_id`),
    CONSTRAINT `fk_request_logs_api_key` FOREIGN KEY (`api_key_id`) REFERENCES `api_keys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `balance_transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `transaction_type` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(18,8) NOT NULL,
    `balance_before` DECIMAL(18,8) NOT NULL,
    `balance_after` DECIMAL(18,8) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `detail` VARCHAR(255) NULL,
    `reference_id` VARCHAR(80) NULL,
    `created_by` VARCHAR(80) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_balance_transactions_user_id` (`user_id`),
    INDEX `idx_balance_transactions_created_at` (`created_at`),
    CONSTRAINT `fk_balance_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
