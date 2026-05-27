<?php
namespace App\Controllers;

use App\Models\Todo;

class ApiController {
    private Todo $todo;

    public function __construct() {
        $this->todo = new Todo();
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
    }

    public function list(): string {
        return json_encode($this->todo->getAll());
    }

    public function create(): string {
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['text'])) {
            http_response_code(400);
            return json_encode(['error' => 'text is required']);
        }
        $this->todo->add($data['text']);
        http_response_code(201);
        return json_encode(['message' => 'created']);
    }

    public function toggle(int $id): string {
        $this->todo->toggle($id);
        return json_encode(['message' => 'toggled']);
    }

    public function delete(int $id): string {
        $this->todo->delete($id);
        return json_encode(['message' => 'deleted']);
    }
}
