# 📖 第 5 课：API 路由与前端界面

## 5.1 API 路由

Next.js App Router 约定：`app/api/xxx/route.ts` 会自动变成 `/api/xxx` 的 API 接口。

### 5.1.1 知识入库 API

**位置**：`app/api/ingest/route.ts`
**接口**：`POST /api/ingest`

请求：
```json
{
  "content": "RAG 是检索增强生成的缩写，是一种让 AI..."
}
```

成功响应：
```json
{
  "message": "✅ 文本已成功存入知识库！"
}
```

错误响应：
```json
{
  "error": "请提供 content 字段（字符串类型）"
}
```

**代码解析**：

```typescript
export async function POST(request: NextRequest) {
  // 1. 从请求体中提取 content
  const body = await request.json();
  const { content } = body;

  // 2. 参数校验
  if (!content || typeof content !== "string") {
    return NextResponse.json(
      { error: "请提供 content 字段（字符串类型）" },
      { status: 400 }  // 400 = Bad Request
    );
  }

  // 3. 调用业务逻辑
  const message = await ingest(content);

  // 4. 返回结果
  return NextResponse.json({ message });
}
```

> **为什么要在 API 层做参数校验？**
> 防御性编程原则：永远不要信任外部输入。
> 1. 用户可能忘了传 content 参数
> 2. 可能传了空字符串
> 类型不对会导致数据库出错，早检查、早拒绝、早反馈。

### 5.1.2 知识问答 API

**位置**：`app/api/query/route.ts`
**接口**：`POST /api/query`

请求：
```json
{
  "question": "什么是 RAG？"
}
```

成功响应：
```json
{
  "answer": "RAG 是 Retrieval-Augmented Generation 的缩写...",
  "sources": [
    "RAG 是检索增强生成的缩写...",
    "RAG 的核心思想是..."
  ]
}
```

> **为什么返回 sources（来源）？**
> 1. 用户可以验证回答是否准确
> 2. 体现 RAG 的"增强"部分——回答有据可查
> 3. 方便调试：如果回答不对，可以检查来源是否正确

## 5.2 前端页面

**位置**：`app/page.tsx`

### 为什么用客户端组件？

```typescript
"use client";  // 这个指令告诉 Next.js：这是客户端组件
```

> **"use client" 是什么？**
> Next.js 14 默认所有组件是"服务端组件"（在服务器渲染）。
> 但我们的页面需要：
> 1. 响应用户输入（输入框 onChange）
> 2. 点击按钮发送请求
> 3. 更新页面内容
>
> 这些都需要浏览器端的 JavaScript 能力，所以需要 "use client"。

### 核心交互

**知识入库流程：**
```
用户输入文本 → 点击"存入知识库" → POST /api/ingest
→ 显示成功/失败消息
```

**知识问答流程：**
```
用户输入问题 → 点击"提问" → POST /api/query
→ 显示 AI 回答 + 显示参考来源
```

### fetch API 调用解析

```typescript
const res = await fetch("/api/ingest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content: ingestText }),
});
const data = await res.json();
```

> **为什么是 POST 而不是 GET？**
> - 知识入库：提交数据 → POST（创建资源）
> - 知识问答：虽然是在"查"，但也用 POST，因为需要传 question 正文
> - GET 请求的 body 在某些浏览器和代理中不受支持
> - 所以传递复杂参数时通常用 POST + JSON body

### 在浏览器中测试 API

打开浏览器开发者工具（F12）→ Console，输入：

```javascript
// 测试知识入库
await fetch("/api/ingest", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    content: "RAG 是检索增强生成的缩写。",
  }),
}).then(r => r.json());

// 测试知识问答
await fetch("/api/query", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: "RAG 是什么？",
  }),
}).then(r => r.json());
```

> **直接在浏览器测试 API 的好处：**
> 不需要额外的工具（如 Postman），浏览器 Console 就是你的 API 调试器。

## 5.3 错误处理策略

### 前端错误处理

```typescript
try {
  const res = await fetch("/api/query", { ... });
  const data = await res.json();

  if (res.ok) {
    setAnswer(data.answer);  // 成功：显示回答
  } else {
    setAnswer(data.error);  // 失败：显示错误信息
  }
} catch {
  setAnswer("请求失败，请检查网络连接");  // 网络错误
}
```

三层防御：
1. **网络层**：fetch 本身可能失败（断网、服务器挂了）
2. **HTTP 层**：服务器返回了错误状态码（4xx、5xx）
3. **数据层**：服务器正常但数据不符合预期

### 后端错误处理

```typescript
try {
  const body = await request.json();  // 可能解析失败
  // ...
  const message = await ingest(content);  // 可能业务逻辑失败
  return NextResponse.json({ message });  // 成功
} catch (error) {
  console.error("入库失败:", error);  // 记录日志
  return NextResponse.json(
    { error: "入库失败，请检查控制台日志" },
    { status: 500 }
  );
}
```

> **为什么返回 500 而不是更具体的错误？**
> 安全考虑：不要把内部错误细节暴露给用户。
> 这些信息应该记录在服务器日志里，开发者去查日志。

---

**[最终课：运行与测试 →](./06-运行与测试.md)**
