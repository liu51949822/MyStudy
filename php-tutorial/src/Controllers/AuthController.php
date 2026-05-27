<?php
namespace App\Controllers;

class AuthController {
    private array $users = [
        'admin' => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
    ];

    public function login(): string {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $username = $_POST['username'] ?? '';
            $password = $_POST['password'] ?? '';
            
            if (isset($this->users[$username]) && password_verify($password, $this->users[$username])) {
                $_SESSION['user'] = $username;
                header('Location: /');
                exit;
            }
            $error = '用户名或密码错误';
        }
        return \App\Core\View::render('login', ['error' => $error ?? '']);
    }

    public function logout(): void {
        session_destroy();
        header('Location: /login');
        exit;
    }
}
