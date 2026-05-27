<?php
session_start();
require_once __DIR__ . '/../src/Core/Database.php';
require_once __DIR__ . '/../src/Core/Router.php';
require_once __DIR__ . '/../src/Core/View.php';
require_once __DIR__ . '/../src/Models/Todo.php';
require_once __DIR__ . '/../src/Controllers/TodoController.php';
require_once __DIR__ . '/../src/Controllers/AuthController.php';

use App\Core\Router;
use App\Controllers\TodoController;
use App\Controllers\AuthController;

// Auth middleware
if (!isset($_SESSION['user']) && $_SERVER['REQUEST_URI'] !== '/login') {
    header('Location: /login');
    exit;
}

$router = new Router();
$todo = new TodoController();
$auth = new AuthController();

$router->get('/', [$todo, 'index']);
$router->post('/add', [$todo, 'add']);
$router->post('/toggle', fn() => $todo->toggle((int)$_POST['id']));
$router->post('/delete', fn() => $todo->delete((int)$_POST['id']));
$router->get('/login', [$auth, 'login']);
$router->post('/login', [$auth, 'login']);
$router->get('/logout', [$auth, 'logout']);

$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
