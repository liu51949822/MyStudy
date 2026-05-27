<?php
namespace App\Models;

use App\Core\Database;

class Todo {
    private \PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getAll(): array {
        return $this->db->query('SELECT * FROM todos ORDER BY created_at DESC')->fetchAll();
    }

    public function add(string $text): void {
        $stmt = $this->db->prepare('INSERT INTO todos (text) VALUES (:text)');
        $stmt->execute(['text' => $text]);
    }

    public function toggle(int $id): void {
        $stmt = $this->db->prepare('UPDATE todos SET done = NOT done WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    public function delete(int $id): void {
        $stmt = $this->db->prepare('DELETE FROM todos WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }

    public function getStats(): array {
        return [
            'total' => $this->db->query('SELECT COUNT(*) FROM todos')->fetchColumn(),
            'done' => $this->db->query('SELECT COUNT(*) FROM todos WHERE done = 1')->fetchColumn(),
        ];
    }
}
