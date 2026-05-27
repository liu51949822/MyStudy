<?php
namespace App\Core;

class View {
    public static function render(string $template, array $data = []): string {
        extract($data);
        ob_start();
        require __DIR__ . "/../../templates/{$template}.php";
        return ob_get_clean();
    }
}
