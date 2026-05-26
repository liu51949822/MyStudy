# 📖 PHP 第 1 课：环境搭建与基础语法

## 1.1 环境准备

```bash
# 检查 PHP 是否已安装
php --version    # 需要 >= 8.0

# 启动 PHP 内置服务器
cd php-tutorial
php -S localhost:8080 -t public
```

浏览器打开 http://localhost:8080

## 1.2 PHP 基础语法速览

```php
<?php
// 变量以 $ 开头
$name = "小明";
$age = 25;

// 数组
$colors = ["红", "绿", "蓝"];
$user = ["name" => "小明", "age" => 25];

// 函数
function hello($name) {
    return "你好, $name!";
}

// 条件
if ($age >= 18) {
    echo "成年人";
}

// 循环
foreach ($colors as $color) {
    echo $color;
}
?>
```

## 1.3 本课项目：Todo List

知识点：
- 变量与数组
- 函数定义
- 表单处理（$_POST）
- 文件读写（file_get_contents / file_put_contents）
- JSON 编解码
- HTML 渲染

## 1.4 课后练习
1. 给 Todo 添加"编辑"功能
2. 增加优先级字段（高/中/低）
3. 按创建时间排序
