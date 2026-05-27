# 📖 PHP 第 4 课：MVC 架构模式

## 什么是 MVC？
- **Model**: 数据层（数据库操作）
- **View**: 展示层（HTML 模板）
- **Controller**: 控制层（业务逻辑）

## 路由系统
```php
$router->get('/', [TodoController::class, 'index']);
$router->post('/add', [TodoController::class, 'add']);
```

## 模板渲染
```php
// Controller 中
return View::render('index', ['todos' => $data]);
```

## 命名空间
```php
namespace App\Controllers;
use App\Models\Todo;
```
