# 📖 MCP 第 3 课：Resources 与 Prompts

## Resources（资源）
Resources 提供结构化数据，类似 REST API 的 GET 请求。
```typescript
// 列出资源
ListResourcesRequestSchema
// 读取资源内容
ReadResourceRequestSchema
```

## Prompts（提示词模板）
Prompts 是预定义的对话模板。
```typescript
ListPromptsRequestSchema    // 列出模板
GetPromptRequestSchema      // 获取模板内容
```

## 三剑客
| MCP 能力 | 类比 | 用途 |
|---------|------|------|
| Tools | 函数调用 | 执行操作 |
| Resources | GET API | 读取数据 |
| Prompts | 模板 | 生成提示词 |
