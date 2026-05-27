# 📖 MCP 第 7 课：生产级 MCP Server

## 错误处理
所有工具调用都应该 try-catch：
```typescript
try {
  // 工具逻辑
} catch (error) {
  return { content: [{ type: "text", text: error.message }], isError: true };
}
```

## 类型安全
使用 TypeScript 严格模式定义数据结构。

## Docker 部署
```dockerfile
FROM node:20-alpine
WORKDIR /app
CMD ["node", "dist/mcp-server.js"]
```

## 完整项目：Todo MCP Server
这个 Server 提供了完整的 CRUD 操作，可以作为真实项目的起点。
