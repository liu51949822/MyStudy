# 📖 MCP 第 5 课：MCP Client 开发

## Client 的作用
Client 连接 Server，调用其暴露的工具和资源。

## 连接 Server
```typescript
const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/server.ts"],
});
await client.connect(transport);
```

## 调用流程
1. 创建 Client 实例
2. 用 Transport 连接 Server
3. 列出工具/资源
4. 调用工具/读取资源
5. 断开连接

## 运行方式
```bash
npx tsx src/client.ts
```
