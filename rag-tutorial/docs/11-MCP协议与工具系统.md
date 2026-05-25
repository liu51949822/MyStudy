# 📖 第 11 课：MCP 协议与工具系统

## 11.1 什么是 MCP？

**MCP = Model Context Protocol（模型上下文协议）**

MCP 是一个标准化的协议，让 AI 模型可以通过统一的方式调用外部工具和获取数据。

### 现实类比

```
没有 MCP 的 AI：
  用户："帮我查一下RAG的最新进展"
  AI："我没办法查，我只能凭记忆回答"
  （AI 被困在自己的知识里）

有 MCP 的 AI：
  用户："帮我查一下RAG的最新进展"
  AI：（调用工具搜索）"让我查一下..."
  AI："根据搜索结果，RAG的最新进展包括..."
  （AI 可以获取实时信息）
```

## 11.2 工作流程

```
用户提问
  │
  ▼
Round 1: 消息 + 工具定义 → AI
  │  AI 思考:"我需要查资料"
  │
  ▼
AI 返回工具调用: rag_search(query="RAG 最新进展")
  │
  ▼
系统执行工具 → 搜索结果 [{...}, {...}]
  │
  ▼
Round 2: 消息 + 工具结果 → AI
  │  AI 基于搜索结果生成回答
  │
  ▼
AI 返回最终回答
```

## 11.3 代码实现

### 工具定义 (tools.ts)

```typescript
// 每个工具是一个 MCPTool 对象
const tool: MCPTool = {
  name: "rag_search",
  description: "在知识库中搜索相关文档",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "搜索关键词" },
      top_k: { type: "number", default: 3 },
    },
    required: ["query"],
  },
  handler: async (args) => {
    // 实际执行搜索
    return { results: [...] };
  },
};
```

### 工具注册

```typescript
// 在 tools.ts 文件中注册
registerTool({
  name: "rag_search",
  description: "...",
  // ...
});
```

### AI 调用工具 (embeddings.ts)

```typescript
// OpenAI 的 function calling 格式
const response = await openai.chat.completions.create({
  messages,
  tools: [
    {
      type: "function",
      function: {
        name: "rag_search",
        description: "...",
        parameters: { ... },
      },
    },
  ],
  tool_choice: "auto",  // AI 自主决定是否调用
});

// 检查 AI 是否调用了工具
if (responseMessage.tool_calls) {
  // 执行工具
  for (const toolCall of responseMessage.tool_calls) {
    const result = await executeTool(toolCall.function.name, args);
    // 把结果返回给 AI
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }
  // AI 基于工具结果生成最终回答
  const finalResponse = await openai.chat.completions.create({ messages });
}
```

## 11.4 MCP API 端点

```
POST /api/mcp
Content-Type: application/json

{
  "method": "tools/call",
  "params": {
    "name": "rag_search",
    "arguments": {
      "query": "什么是RAG",
      "top_k": 3
    }
  }
}
```

这样外部系统也可以通过 MCP 协议调用 RAG 功能。

## 11.5 工具系统的优势

| 特性 | 无工具 | 有工具 |
|------|--------|--------|
| 知识范围 | 只限于训练数据 | 可以实时查询 |
| 自主性 | 被动回答问题 | 主动决定查什么 |
| 可扩展性 | 固定能力 | 可注册新工具 |
| 精确性 | 凭记忆可能有幻觉 | 基于真实数据 |

## 11.6 课后练习

1. **添加新工具**：注册一个 `rag_count` 工具，返回知识库中的文档总数
2. **工具链**：让 AI 先调用 `rag_search`，再调用 `rag_summarize`
3. **自定义工具**：添加一个 `web_search` 工具，调用外部搜索 API
4. **工具权限**：添加工具的权限控制（某些工具只有管理员能用）
