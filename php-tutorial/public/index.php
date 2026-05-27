<?php
require_once __DIR__ . '/../src/Core/Database.php';
require_once __DIR__ . '/../src/Core/Router.php';
require_once __DIR__ . '/../src/Core/View.php';
require_once __DIR__ . '/../src/Models/Todo.php';
require_once __DIR__ . '/../src/Controllers/TodoController.php';

use App\Core\Router;
use App\Controllers\TodoController;

$router = new Router();
$controller = new TodoController();

$router->get('/', [$controller, 'index']);
$router->post('/add', [$controller, 'add']);
$router->post('/toggle', fn() => $controller->toggle((int)$_POST['id']));
$router->post('/delete', fn() => $controller->delete((int)$_POST['id']));

$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
