<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>MVC Todo</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
.form { display: flex; gap: 8px; margin-bottom: 20px; }
.form input[type="text"] { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
.form button { padding: 10px 20px; background: #0070f3; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.item { display: flex; align-items: center; gap: 8px; padding: 10px; border-bottom: 1px solid #eee; }
.item.done span { text-decoration: line-through; color: #999; }
.stats { margin-top: 20px; padding: 12px; background: #f5f5f5; border-radius: 4px; }
</style></head>
<body>
<h1>📋 MVC Todo</h1>
<form method="POST" action="/add" class="form">
    <input type="text" name="text" placeholder="添加待办..." required>
    <button type="submit">添加</button>
</form>
<?php foreach ($todos as $todo): ?>
<div class="item <?= $todo['done'] ? 'done' : '' ?>">
    <form method="POST" action="/toggle" style="display:inline;">
        <input type="hidden" name="id" value="<?= $todo['id'] ?>">
        <button type="submit" style="background:none;border:1px solid #ddd;border-radius:3px;cursor:pointer;"><?= $todo['done'] ? '✅' : '⬜' ?></button>
    </form>
    <span style="flex:1;"><?= htmlspecialchars($todo['text']) ?></span>
    <form method="POST" action="/delete" style="display:inline;">
        <input type="hidden" name="id" value="<?= $todo['id'] ?>">
        <button type="submit" style="background:#ff4444;color:#fff;border:none;border-radius:3px;cursor:pointer;">🗑</button>
    </form>
</div>
<?php endforeach; ?>
<div class="stats">共 <?= $stats['total'] ?> 项 · 已完成 <?= $stats['done'] ?> 项</div>
</body></html>
