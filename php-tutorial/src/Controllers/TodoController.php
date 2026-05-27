<?php
namespace App\Controllers;

use App\Core\View;
use App\Models\Todo;

class TodoController {
    private Todo $todo;

    public function __construct() {
        $this->todo = new Todo();
    }

    public function index(): string {
        return View::render('index', [
            'todos' => $this->todo->getAll(),
            'stats' => $this->todo->getStats(),
        ]);
    }

    public function add(): void {
        if (!empty($_POST['text'])) {
            $this->todo->add(trim($_POST['text']));
        }
        header('Location: /');
        exit;
    }

    public function toggle(int $id): void {
        $this->todo->toggle($id);
        header('Location: /');
        exit;
    }

    public function delete(int $id): void {
        $this->todo->delete($id);
        header('Location: /');
        exit;
    }
}
