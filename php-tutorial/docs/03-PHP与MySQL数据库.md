# 📖 PHP 第 3 课：PHP 与 MySQL 数据库

## PDO 简介
PDO (PHP Data Objects) 是 PHP 的数据库抽象层。

## 连接数据库
```php
$pdo = new PDO('mysql:host=localhost;dbname=php_todo', 'root', '');
```

## 准备语句（防 SQL 注入）
```php
$stmt = $pdo->prepare('INSERT INTO todos (text) VALUES (:text)');
$stmt->execute(['text' => $text]);
```

## 本课新增
- PDO 连接与配置
- CRUD 操作（增删改查）
- 准备语句与 SQL 注入防护
