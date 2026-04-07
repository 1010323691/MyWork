CREATE DATABASE llm_gateway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'llm_gateway'@'localhost' IDENTIFIED BY 'Aa1010323691';
GRANT ALL PRIVILEGES ON llm_gateway.* TO 'llm_gateway'@'localhost';
FLUSH PRIVILEGES;
EXIT;

SELECT user, host FROM mysql.user;


GRANT ALL PRIVILEGES ON llm_gateway.* TO 'llm_gateway'@'localhost';
FLUSH PRIVILEGES;

mysql -u llm_gateway -pmysql -u llm_gateway -p


SHOW GRANTS FOR 'llm_gateway'@'localhost';


ALTER USER 'llm_gateway'@'localhost' IDENTIFIED BY 'Aa1010323691';
FLUSH PRIVILEGES;


INSERT INTO llm_gateway.users (username, password, email, enabled, user_role, created_at, updated_at)
VALUES ('admin', '$2a$10$XXX...', 'admin@example.com', TRUE, 'ADMIN', NOW(), NOW());

drop TABLE llm_gateway.users;