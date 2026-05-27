<?php
namespace App\Services;

use App\Models\Todo;

class TodoService {
    private Todo $todo;

    public function __construct(Todo $todo) {
        $this->todo = $todo;
    }

    public function getAllTodos(): array {
        return $this->todo->getAll();
    }

    public function createTodo(string $text): void {
        if (mb_strlen($text) < 2) {
            throw new \InvalidArgumentException('内容至少2个字符');
        }
        $this->todo->add($text);
    }

    public function toggleTodo(int $id): void {
        $this->todo->toggle($id);
    }

    public function deleteTodo(int $id): void {
        $this->todo->delete($id);
    }

    public function getSummary(): array {
        $stats = $this->todo->getStats();
        return [
            'total' => $stats['total'],
            'done' => $stats['done'],
            'pending' => $stats['total'] - $stats['done'],
            'completion_rate' => $stats['total'] > 0 
                ? round($stats['done'] / $stats['total'] * 100, 1) 
                : 0,
        ];
    }
}
