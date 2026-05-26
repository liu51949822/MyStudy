<?php
/**
 * PHP 入门教程 - 第 1 课
 * 
 * 这是 PHP 内置服务器的入口文件。
 * 启动方式：php -S localhost:8080 -t public
 * 
 * PHP 最简应用：Todo List（文件存储版）
 * 知识点：变量、数组、函数、表单处理、文件读写
 */

// ========== 配置 ==========
define('DATA_FILE', __DIR__ . '/../data/todos.json');

// ========== 工具函数 ==========

/** 读取所有待办事项 */
function getTodos(): array {
    if (!file_exists(DATA_FILE)) {
        return [];
    }
    $json = file_get_contents(DATA_FILE);
    return json_decode($json, true) ?? [];
}

/** 保存待办事项 */
function saveTodos(array $todos): void {
    file_put_contents(DATA_FILE, json_encode($todos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/** 添加待办事项 */
function addTodo(string $text): void {
    $todos = getTodos();
    $todos[] = [
        'id' => uniqid(),
        'text' => $text,
        'done' => false,
        'created_at' => date('Y-m-d H:i:s'),
    ];
    saveTodos($todos);
}

/** 删除待办事项 */
function deleteTodo(string $id): void {
    $todos = getTodos();
    $todos = array_filter($todos, fn($t) => $t['id'] !== $id);
    saveTodos(array_values($todos));
}

/** 切换完成状态 */
function toggleTodo(string $id): void {
    $todos = getTodos();
    foreach ($todos as &$t) {
        if ($t['id'] === $id) {
            $t['done'] = !$t['done'];
            break;
        }
    }
    saveTodos($todos);
}

// ========== 路由处理 ==========

$action = $_POST['action'] ?? $_GET['action'] ?? 'list';

// 处理表单提交
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'add' && !empty($_POST['text'])) {
        addTodo(trim($_POST['text']));
    } elseif ($action === 'delete' && !empty($_POST['id'])) {
        deleteTodo($_POST['id']);
    } elseif ($action === 'toggle' && !empty($_POST['id'])) {
        toggleTodo($_POST['id']);
    }
    // 重定向避免表单重复提交
    header('Location: /');
    exit;
}

// ========== 获取数据 ==========
$todos = getTodos();

// ========== 渲染 HTML ==========
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Todo List - 入门教程</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        h1 { font-size: 24px; }
        .todo-input { display: flex; gap: 8px; margin-bottom: 20px; }
        .todo-input input { flex: 1; padding: 10px; font-size: 14px; border: 1px solid #ddd; border-radius: 4px; }
        .todo-input button { padding: 10px 20px; background: #0070f3; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        .todo-item { display: flex; align-items: center; gap: 8px; padding: 10px; border-bottom: 1px solid #eee; }
        .todo-item.done span { text-decoration: line-through; color: #999; }
        .todo-item form { margin: 0; }
        .todo-item button { padding: 4px 8px; font-size: 12px; cursor: pointer; }
        .stats { margin-top: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 13px; color: #666; }
        .nav { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; color: #999; }
    </style>
</head>
<body>
    <h1>📋 PHP Todo List</h1>
    <p style="color:#666;font-size:14px;">最简单的 PHP 入门应用 — 文件存储版</p>

    <!-- 添加表单 -->
    <form method="POST" class="todo-input">
        <input type="text" name="text" placeholder="输入待办事项..." required>
        <input type="hidden" name="action" value="add">
        <button type="submit">添加</button>
    </form>

    <!-- 待办列表 -->
    <?php if (empty($todos)): ?>
        <p style="color:#999;text-align:center;padding:40px 0;">还没有待办事项，在上面添加一个吧！</p>
    <?php else: ?>
        <?php foreach ($todos as $todo): ?>
            <div class="todo-item <?= $todo['done'] ? 'done' : '' ?>">
                <form method="POST" style="display:inline;">
                    <input type="hidden" name="action" value="toggle">
                    <input type="hidden" name="id" value="<?= $todo['id'] ?>">
                    <button type="submit" style="background:none;border:1px solid #ddd;border-radius:3px;cursor:pointer;">
                        <?= $todo['done'] ? '✅' : '⬜' ?>
                    </button>
                </form>
                <span style="flex:1;"><?= htmlspecialchars($todo['text']) ?></span>
                <small style="color:#ccc;font-size:11px;"><?= $todo['created_at'] ?></small>
                <form method="POST" style="display:inline;">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" value="<?= $todo['id'] ?>">
                    <button type="submit" style="background:#ff4444;color:#fff;border:none;border-radius:3px;cursor:pointer;">删除</button>
                </form>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>

    <!-- 统计 -->
    <div class="stats">
        <?php
        $total = count($todos);
        $done = count(array_filter($todos, fn($t) => $t['done']));
        $pending = $total - $done;
        ?>
        共 <strong><?= $total ?></strong> 项 ·
        已完成 <strong><?= $done ?></strong> 项 ·
        待完成 <strong><?= $pending ?></strong> 项
    </div>

    <!-- PHP 学习信息 -->
    <div class="nav">
        <p>📖 当前学习：变量 · 数组 · 函数 · 表单 · 文件读写</p>
        <p>⚡ 启动方式：<code>php -S localhost:8080 -t public</code></p>
        <p>💾 数据存储：<code>data/todos.json</code>（JSON 文件）</p>
    </div>
</body>
</html>
