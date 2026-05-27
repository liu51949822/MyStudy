-- PHP 教程 - 数据库初始化脚本
-- 运行方式: mysql -u root -p < sql/schema.sql

CREATE DATABASE IF NOT EXISTS php_todo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE php_todo;

CREATE TABLE IF NOT EXISTS todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(500) NOT NULL,
    done TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
