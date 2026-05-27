# 📖 PHP 第 6 课：RESTful API 开发

## REST API 设计
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/todos | 获取列表 |
| POST | /api/todos | 创建待办 |
| DELETE | /api/todos/{id} | 删除 |

## JSON 响应
```php
header('Content-Type: application/json');
echo json_encode($data);
```

## CORS
```php
header('Access-Control-Allow-Origin: *');
```
