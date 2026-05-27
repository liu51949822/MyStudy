<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>登录</title>
<style>body{font-family:system-ui;max-width:400px;margin:40px auto;padding:20px}
input{width:100%;padding:10px;margin:8px 0;border:1px solid #ddd;border-radius:4px;box-sizing:border-box}
button{width:100%;padding:10px;background:#0070f3;color:#fff;border:none;border-radius:4px;cursor:pointer}
.error{color:#ff4444;font-size:14px}</style></head><body>
<h1>登录</h1>
<?php if (!empty($error)): ?><p class="error"><?= $error ?></p><?php endif; ?>
<form method="POST">
<input type="text" name="username" placeholder="用户名" required>
<input type="password" name="password" placeholder="密码" required>
<button type="submit">登录</button>
</form>
<p style="font-size:13px;color:#999;margin-top:12px">测试账号: admin / password</p>
</body></html>