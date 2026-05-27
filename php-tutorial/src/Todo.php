<?php
require_once __DIR__ . '/Database.php';

/**
 * Todo 模型类
 * 封装所有数据库操作
 */
class Todo {
    private PDO $db;
    
    public function __construct() {
        $this->db = Database::getConnection();
    }
    
    /** 获取所有待办 */
    public function getAll(): array {
        $stmt = $this->db->query('SELECT * FROM todos ORDER BY created_at DESC');
        return $stmt->fetchAll();
    }
    
    /** 添加待办 */
    public function add(string $text): void {
        $stmt = $this->db->prepare('INSERT INTO todos (text) VALUES (:text)');
        $stmt->execute(['text' => $text]);
    }
    
    /** 切换状态 */
    public function toggle(int $id): void {
        $stmt = $this->db->prepare('UPDATE todos SET done = NOT done WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
    
    /** 删除待办 */
    public function delete(int $id): void {
        $stmt = $this->db->prepare('DELETE FROM todos WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
    
    /** 获取统计 */
    public function getStats(): array {
        return [
            'total' => $this->db->query('SELECT COUNT(*) FROM todos')->fetchColumn(),
            'done' => $this->db->query('SELECT COUNT(*) FROM todos WHERE done = 1')->fetchColumn(),
        ];
    }
}
