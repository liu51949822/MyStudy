# rag_3: 对话式 RAG — 实现计划

## 任务概述
在 `rag_3` 分支上（基于 rag_2），实现多轮对话与聊天历史管理，将单轮 Q&A 扩展为对话式 RAG。

## 分支操作
```bash
cd /Users/apple/Documents/MyStudy
git checkout rag_3   # 已在此分支上（基于 rag_2）
```

## 需要创建/修改的文件

### 1. 新建: `rag-tutorial/lib/chat-history.ts`
聊天历史管理模块。使用内存在线存储（Map），适合教学目的。

**文件完整内容**:
```typescript
/**
 * ============================================
 * 聊天历史管理 — lib/chat-history.ts
 * ============================================
 *
 * 这个文件负责管理多轮对话的聊天历史。
 *
 * 为什么需要聊天历史？
 * --------------------------------------------
 * 单轮对话：每次提问都是独立的，AI 不知道上一轮说了什么。
 * 多轮对话：AI 能看到之前的对话记录，能理解"它"、"这个"等代词，
 *          也能根据上文做更准确的追问回答。
 *
 * 为什么限制历史长度？
 * --------------------------------------------
 * 每次调用 AI API 都有 token 上限，历史太长会：
 * 1. 占用大量 token（= 浪费钱）
 * 2. 响应变慢（token 越多处理越久）
 * 3. 超过模型上下文窗口限制
 * 所以只取最近 N 条消息，保持 token 预算可控。
 *
 * 为什么用内存 Map 而不是数据库？
 * --------------------------------------------
 * 1. 简单：不需要额外的数据库操作，适合教学
 * 2. 快速：内存读写速度最快
 * 3. 易理解：代码逻辑清晰，不引入额外概念
 * 在生产环境中，应该使用 Redis 或数据库来持久化会话。
 */

/** 单条聊天消息 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

/** 一次聊天会话 */
export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
}

/**
 * 会话存储
 *
 * key = sessionId (UUID)
 * value = ChatSession（包含该会话的所有历史消息）
 *
 * 注意：这是内存存储，重启服务器后所有会话都会消失。
 * 对于学习目的足够，生产环境请换成 Redis/数据库。
 */
const sessions = new Map<string, ChatSession>();

/**
 * 创建新会话
 *
 * 生成一个唯一的 sessionId，初始化空的聊天记录。
 *
 * @returns 新会话的 ID
 */
export function createSession(): string {
  const id = crypto.randomUUID();
  sessions.set(id, {
    id,
    messages: [],
    createdAt: Date.now(),
  });
  return id;
}

/**
 * 获取指定会话
 *
 * @param sessionId - 会话 ID
 * @returns ChatSession 对象；如果不存在则返回 null
 */
export function getSession(sessionId: string): ChatSession | null {
  return sessions.get(sessionId) ?? null;
}

/**
 * 向会话中添加一条消息
 *
 * 同时保存用户提问和 AI 回答，形成完整的对话记录。
 *
 * @param sessionId - 会话 ID
 * @param role      - 消息角色（"user" 或 "assistant"）
 * @param content   - 消息内容
 */
export function addMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): void {
  const session = sessions.get(sessionId);
  if (!session) return; // 会话不存在，不执行任何操作

  session.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
}

/**
 * 获取最近的 N 条消息
 *
 * 用于构建 AI 调用的上下文。只取最近的几条，
 * 避免超过 token 限制。
 *
 * @param sessionId - 会话 ID
 * @param limit     - 最多返回的消息数（默认 6，即最近 3 轮对话）
 * @returns 最近的消息列表（按时间正序）
 */
export function getRecentMessages(
  sessionId: string,
  limit: number = 6
): ChatMessage[] {
  const session = sessions.get(sessionId);
  if (!session) return [];

  return session.messages.slice(-limit);
}

/**
 * 裁剪历史消息
 *
 * 当对话轮次过多时，保留最近的消息，删除旧的。
 * 防止内存无限增长。
 *
 * @param sessionId    - 会话 ID
 * @param maxMessages  - 最多保留的消息数（默认 20，即最近 10 轮对话）
 */
export function trimHistory(
  sessionId: string,
  maxMessages: number = 20
): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  if (session.messages.length > maxMessages) {
    session.messages = session.messages.slice(-maxMessages);
  }
}
```

---

### 2. 新建: `rag-tutorial/app/api/chat/route.ts`
对话 API 端点，支持多轮对话。

**文件完整内容**:
```typescript
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/chat
 *
 * 多轮对话接口
 *
 * 与 /api/query 的区别：
 * 1. 接受 sessionId 参数，支持多轮对话
 * 2. 返回 sessionId，前端可以保存以便继续对话
 * 3. 如果提供 sessionId，AI 能看到之前的对话历史
 *
 * 请求体格式：
 * {
 *   "question": "你的问题...",
 *   "sessionId": "可选，会话ID"
 * }
 *
 * 响应格式：
 * {
 *   "answer": "AI 基于知识库和对话历史的回答...",
 *   "sources": ["相关文档1", "相关文档2", ...],
 *   "sessionId": "abc-123-def"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, sessionId } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "请提供 question 字段（字符串类型）" },
        { status: 400 }
      );
    }

    if (question.trim().length === 0) {
      return NextResponse.json(
        { error: "question 不能为空" },
        { status: 400 }
      );
    }

    // 动态 import：避免构建时连接数据库
    const { query } = await import("@/lib/rag");
    const result = await query(question, sessionId || undefined);

    return NextResponse.json(result);
  } catch (error) {
    console.error("对话查询失败:", error);
    return NextResponse.json(
      { error: "对话查询失败，请检查控制台日志" },
      { status: 500 }
    );
  }
}
```

---

### 3. 修改: `rag-tutorial/lib/embeddings.ts`

修改 `askAIWithContext` 函数，增加可选的 `history` 参数。

**需要修改的位置 — 函数签名（第 87-90 行）**:

将:
```typescript
export async function askAIWithContext(
  question: string,
  context: string
): Promise<string> {
```

改为:
```typescript
export async function askAIWithContext(
  question: string,
  context: string,
  history?: { role: string; content: string }[]
): Promise<string> {
```

**需要修改的位置 — messages 数组构建（第 102-114 行）**:

将:
```typescript
      {
        role: "system",
        content: `你是一个知识库助手。
请基于以下资料来回答用户的问题。
如果资料里没有相关信息，请说"资料库中未找到相关信息"。
回答要简洁、准确。`,
      },
      {
        role: "user",
        content: `=== 参考资料 ===\n${context}\n\n=== 用户问题 ===\n${question}`,
      },
```

改为:
```typescript
      {
        role: "system",
        content: `你是一个知识库助手。
请基于以下资料来回答用户的问题。
如果资料里没有相关信息，请说"资料库中未找到相关信息"。
回答要简洁、准确。请注意对话的上下文，理解用户的追问意图。`,
      },
      // 如果提供了对话历史，插入到系统消息和当前问题之间
      // 这样 AI 能理解"它"、"这个"等代词指的是什么
      ...(history || []),
      {
        role: "user",
        content: `=== 参考资料 ===\n${context}\n\n=== 用户问题 ===\n${question}`,
      },
```

**注意**：TypeScript 中 `...(history || [])` 展开为 0 个或多个 `{ role: string; content: string }` 对象，这与 DeepSeek SDK 的 `ChatCompletionMessageParam` 类型兼容。

---

### 4. 修改: `rag-tutorial/lib/rag.ts`

修改 `query()` 函数，支持 sessionId 和历史管理。

**需要添加的 import（第 45 行之后）**:

将:
```typescript
import { getEmbedding, askAIWithContext } from "./embeddings";
import { insertDocument, searchSimilarDocuments, initDB } from "./db";
import { chunkText, type ChunkStrategy } from "./chunker";
```

改为:
```typescript
import { getEmbedding, askAIWithContext } from "./embeddings";
import { insertDocument, searchSimilarDocuments, initDB } from "./db";
import { chunkText, type ChunkStrategy } from "./chunker";
import { addMessage, getRecentMessages, createSession, getSession } from "./chat-history";
```

**需要修改的位置 — query 函数签名和返回值（第 119-122 行）**:

将:
```typescript
export async function query(question: string): Promise<{
  answer: string;
  sources: string[];
}> {
```

改为:
```typescript
/**
 * 知识查询 —— 提问并获取基于知识库的回答
 *
 * 现在支持多轮对话：
 * - 传入 sessionId 可以加载之前的聊天历史
 * - AI 会结合上下文理解追问意图
 * - 回答后自动保存到聊天历史
 *
 * @param question  - 用户的问题
 * @param sessionId - 可选，会话 ID（用于多轮对话）
 * @returns AI 的回答、参考来源、会话 ID
 */
export async function query(
  question: string,
  sessionId?: string
): Promise<{
  answer: string;
  sources: string[];
  sessionId: string;
}> {
```

**需要添加 — 在 console.log("🔍 正在处理查询...") 之后（第 123 行之后）**:

```typescript
  console.log("🔍 正在处理查询...");

  // ========== 步骤 0: 会话管理（新增） ==========
  // 如果没提供 sessionId 或该会话不存在，创建新会话
  if (!sessionId || !getSession(sessionId)) {
    sessionId = createSession();
    console.log(`🆕 已创建新会话: ${sessionId}`);
  } else {
    console.log(`📂 继续使用会话: ${sessionId}`);
  }

  // 获取最近 6 条历史消息（最近 3 轮对话），作为上下文
  // 限制数量是为了控制 token 消耗
  const history = getRecentMessages(sessionId, 6);
  if (history.length > 0) {
    console.log(`📝 已加载 ${history.length} 条历史消息`);
  }
```

**需要修改 — askAIWithContext 调用（第 145 行）**:

将:
```typescript
  const answer = await askAIWithContext(question, context);
```

改为:
```typescript
  const answer = await askAIWithContext(question, context, history);
```

**需要修改 — return 语句（第 148-151 行）**:

将:
```typescript
  return {
    answer,
    sources: similarDocs.map((doc) => doc.content),
  };
```

改为:
```typescript
  // ========== 步骤 5: 保存对话记录（新增） ==========
  // 把用户问题和 AI 回答都存到聊天历史中
  addMessage(sessionId, "user", question);
  addMessage(sessionId, "assistant", answer);

  // 定期裁剪旧消息，防止内存无限增长
  trimHistory(sessionId, 20);

  return {
    answer,
    sources: similarDocs.map((doc) => doc.content),
    sessionId,
  };
```

**backwards_compatibility**: 原有的 `/api/query` 路由不传 sessionId，新的 `query()` 会自动创建会话并返回 sessionId。原有代码只需忽略新增的 `sessionId` 字段即可正常工作，没有破坏性变更。

---

### 5. 修改: `rag-tutorial/app/page.tsx`

将三区域布局改为聊天风格布局。

**文件完整内容（替换原有文件）**:
```tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * 自动滚动到最新消息
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * 处理文件上传
   */
  async function handleUpload(e: FormEvent) {
    e.preventDefault();

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadMessage("请先选择一个文件");
      return;
    }

    setUploadLoading(true);
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadMessage(data.message || data.error || "操作完成");
      if (res.ok && fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setUploadMessage("请求失败，请检查网络连接");
    } finally {
      setUploadLoading(false);
    }
  }

  /**
   * 发送聊天消息
   */
  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setLoading(true);

    // 乐观更新：立即显示用户消息
    const userMsg: DisplayMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sessionId }),
      });
      const data = await res.json();

      if (res.ok) {
        setSessionId(data.sessionId);
        const aiMsg: DisplayMessage = {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errMsg: DisplayMessage = {
          role: "assistant",
          content: data.error || "对话失败",
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch {
      const errMsg: DisplayMessage = {
        role: "assistant",
        content: "请求失败，请检查网络连接",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      {/* ===== 顶部标题栏 ===== */}
      <header
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          flexShrink: 0,
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>📚 RAG 知识库</h1>
        <p style={{ fontSize: 12, color: "#999", margin: "4px 0 0 0" }}>
          多轮对话 · 基于知识库的 AI 助手
        </p>
      </header>

      {/* ===== 消息列表（可滚动） ===== */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          backgroundColor: "#fafafa",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#999",
            }}
          >
            <p style={{ fontSize: 36, margin: "0 0 16px 0" }}>💬</p>
            <p style={{ fontSize: 15, margin: 0, lineHeight: 1.8 }}>
              先上传文件或存入文本到知识库，
              <br />
              然后就可以开始对话了。
            </p>
            <p style={{ fontSize: 13, marginTop: 8, color: "#bbb" }}>
              试试追问："它有什么优点？"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 14,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                backgroundColor:
                  msg.role === "user" ? "#0070f3" : "#fff",
                color: msg.role === "user" ? "#fff" : "#333",
                border:
                  msg.role === "assistant"
                    ? "1px solid #e0e0e0"
                    : "none",
                borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                borderBottomLeftRadius: msg.role === "assistant" ? 4 : 12,
              }}
            >
              {msg.content}

              {/* ===== 参考来源（仅 AI 消息） ===== */}
              {msg.role === "assistant" &&
                msg.sources &&
                msg.sources.length > 0 && (
                  <details style={{ marginTop: 10 }}>
                    <summary
                      style={{
                        cursor: "pointer",
                        fontSize: 12,
                        color: "#888",
                      }}
                    >
                      查看参考来源（{msg.sources.length} 条）
                    </summary>
                    <div style={{ marginTop: 6 }}>
                      {msg.sources.map((src, j) => (
                        <p
                          key={j}
                          style={{
                            fontSize: 11,
                            color: "#999",
                            padding: "6px 8px",
                            backgroundColor: "#f5f5f5",
                            borderRadius: 4,
                            marginBottom: 4,
                            lineHeight: 1.5,
                          }}
                        >
                          [{j + 1}] {src.slice(0, 200)}
                          {src.length > 200 ? "..." : ""}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
            </div>
          </div>
        ))}

        {/* ===== 加载指示器 ===== */}
        {loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                backgroundColor: "#fff",
                border: "1px solid #e0e0e0",
                fontSize: 14,
                color: "#999",
              }}
            >
              🤔 思考中...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ===== 文件上传区域（可折叠） ===== */}
      {showUpload && (
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #e0e0e0",
            backgroundColor: "#f5f5f5",
            flexShrink: 0,
          }}
        >
          <form
            onSubmit={handleUpload}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              style={{
                flex: 1,
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={uploadLoading}
              style={{
                padding: "6px 16px",
                fontSize: 13,
                backgroundColor: uploadLoading ? "#ccc" : "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: uploadLoading ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {uploadLoading ? "上传中..." : "上传"}
            </button>
          </form>
          {uploadMessage && (
            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: 12,
                color: "#0070f3",
              }}
            >
              {uploadMessage}
            </p>
          )}
        </div>
      )}

      {/* ===== 底部输入栏 ===== */}
      <div
        style={{
          padding: "12px 20px",
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "#fff",
          flexShrink: 0,
        }}
      >
        <form
          onSubmit={handleSend}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题...（支持追问）"
            disabled={loading}
            style={{
              flex: 1,
              padding: "10px 14px",
              fontSize: 14,
              border: "1px solid #d0d0d0",
              borderRadius: 8,
              outline: "none",
              boxSizing: "border-box",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              backgroundColor:
                loading || !input.trim() ? "#ccc" : "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor:
                loading || !input.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            发送
          </button>
          <button
            type="button"
            onClick={() => setShowUpload(!showUpload)}
            style={{
              padding: "10px 16px",
              fontSize: 13,
              backgroundColor: "#f0f0f0",
              color: "#333",
              border: "1px solid #d0d0d0",
              borderRadius: 8,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            📂
          </button>
        </form>
      </div>
    </main>
  );
}
```

---

### 6. 新建: `rag-tutorial/docs/09-多轮对话实现.md`

**文件完整内容**:
```markdown
# 📖 第 9 课：多轮对话实现

## 9.1 为什么需要多轮对话？

在之前的课程中，每次提问都是独立的——AI 不知道你上一轮问了什么。

### 单轮对话的问题

```
用户：什么是 RAG？
AI：  RAG 是检索增强生成...

用户：它有什么优点？
AI：  请问你指的是什么？   ← AI 不知道"它"指什么！
```

### 多轮对话的解决方案

```
用户：什么是 RAG？
AI：  RAG 是检索增强生成...

用户：它有什么优点？
AI：  RAG 有以下优点...      ← AI 知道"它"指 RAG！
```

通过保留聊天历史，AI 可以理解 `"它"`、`"这个"`、`"上面提到的"` 等代词，实现自然的追问。

## 9.2 聊天历史管理

### 数据结构

```typescript
interface ChatMessage {
  role: "user" | "assistant";  // 谁说的
  content: string;              // 说了什么
  timestamp: number;            // 什么时候说的
}

interface ChatSession {
  id: string;                   // 会话 ID
  messages: ChatMessage[];      // 所有消息
  createdAt: number;            // 创建时间
}
```

### 存储方式

本教程使用**内存 Map** 存储会话：

```typescript
const sessions = new Map<string, ChatSession>();
```

**优点**：简单、快速，不需要配置额外服务
**缺点**：服务器重启后历史丢失

> 在实际项目中，应该使用 Redis、数据库等方式持久化存储。

## 9.3 会话（Session）概念

### 什么是会话？

一个会话代表一次连续的对话。每个会话有唯一的 ID（UUID）。

```
会话 abc-123:
  用户：什么是 RAG？
  AI：  RAG 是...
  用户：它有哪些应用？
  AI：  RAG 可以用于...

会话 def-456:
  用户：什么是 SQL 注入？   ← 不同的会话，不共享历史
  AI：  SQL 注入是...
```

### 会话管理流程

```
前端发起请求
    │
    ├─ 携带 sessionId？
    │   ├─ 是 → 加载该会话的历史
    │   └─ 否 → 创建新会话
    │
    ▼
将历史注入 AI 上下文
    │
    ▼
AI 基于历史 + 资料回答
    │
    ▼
保存 Q&A 到历史
    │
    ▼
返回 sessionId 给前端
```

## 9.4 Token 预算与历史截断

### 什么是 Token？

AI 模型靠 Token 计费。通常：
- 1 个中文字约 = 1.5 tokens
- 1 个英文单词约 = 1 token
- gpt-4o-mini 上下文窗口：128K tokens
- gpt-4o-mini 价格：输入 $0.15/1M tokens

### 为什么要截断历史？

```
第 1 轮：200 tokens
第 2 轮：400 tokens（累积）
第 3 轮：600 tokens
...
第 50 轮：10000+ tokens！
```

每轮都带上完整历史，token 消耗会线性增长。效率很低！

### 解决方案

只保留**最近的 N 条消息**（默认 6 条，即最近 3 轮）：

```typescript
// 只取最后 6 条消息
const history = getRecentMessages(sessionId, 6);

// 定期清理旧消息（超过 20 条时裁剪）
trimHistory(sessionId, 20);
```

这保持了：
- 足够的上下文让 AI 理解追问
- 可控的 token 消耗
- 内存不会无限增长

## 9.5 追问处理原理

### 历史注入到 Prompt 中

```typescript
messages: [
  { role: "system", content: "你是一个知识库助手..." },
  { role: "user", content: "什么是 RAG？" },           // ← 历史
  { role: "assistant", content: "RAG 是检索增强生成..." }, // ← 历史
  { role: "user", content: "它有什么优点？" },           // ← 历史
  { role: "assistant", content: "RAG 有以下优点..." },   // ← 历史
  { role: "user", content: "=== 参考资料 === ... === 用户问题 ===\n有什么缺点？" },  // ← 当前
]
```

AI 看到完整的对话历史，自然能理解"有什么缺点"是在问 RAG。

## 9.6 代码实现

### 新增文件

| 文件 | 作用 |
|------|------|
| `lib/chat-history.ts` | 聊天历史管理（增删查） |
| `app/api/chat/route.ts` | 对话 API（POST /api/chat） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `lib/embeddings.ts` | `askAIWithContext` 增加 `history` 参数 |
| `lib/rag.ts` | `query()` 增加 sessionId 和历史注入 |
| `app/page.tsx` | 改为聊天界面风格 |

### 架构对比

**修改前（rag_2）**：
```
前端 → /api/query → query() → askAIWithContext(q, ctx) → AI
```

**修改后（rag_3）**：
```
前端 → /api/chat → query(q, sessionId)
                      │
                      ├→ getRecentMessages(sessionId) → 获取历史
                      ├→ askAIWithContext(q, ctx, history) → AI
                      ├→ addMessage(q, a) → 保存历史
                      └→ 返回 { answer, sources, sessionId }
```

## 9.7 课后练习

### 练习 1：测试多轮对话

1. 启动应用（`npm run dev`）
2. 先上传一些关于 RAG 的文档
3. 在聊天框输入："什么是 RAG？"
4. 接着输入："它有什么优点？"
5. 再问："你是怎么知道这些的？"
6. 观察 AI 是否能正确理解每个追问

### 练习 2：添加"清除对话"按钮

在 `app/page.tsx` 中添加一个按钮，点击后：
- 清空 `messages` 状态
- 重置 `sessionId` 为 null
- 下次发送消息时会自动创建新会话

### 练习 3：显示会话信息

在页面顶部或底部，用很小的字显示当前 sessionId，帮助调试。

### 练习 4：调整历史条数

修改 `lib/rag.ts` 中 `getRecentMessages` 的 limit 参数：
- 改为 4：观察追问效果是否受影响
- 改为 20：观察 token 消耗和响应速度
- 找出你认为最合适的值

### 练习 5：添加会话列表

在页面侧边栏添加会话列表，可以：
- 查看所有历史会话
- 切换到任意会话继续对话
- 删除某个会话

> 提示：需要新增一个 API 端点返回所有会话 ID 列表。

---

**[← 上一课：文件上传处理](./08-文件上传处理.md) | [回到课程列表](./01-项目概述与环境准备.md)**
```

---

### 7. 修改: `rag-tutorial/docs/01-项目概述与环境准备.md`

**修改位置 1 — 标题和课程数（第 159 行）**:

将:
```
├── docs/                      # 本教程文档（8 节课）
```

改为:
```
├── docs/                      # 本教程文档（9 节课）
```

**修改位置 2 — 目录结构中的 API 和 lib 部分（第 148-158 行）**:

将:
```
│   ├── api/
│   │   ├── ingest/route.ts    # 知识入库 API
│   │   ├── query/route.ts     # 知识问答 API
│   │   └── upload/route.ts    # 文件上传 API
│   ├── layout.tsx             # 页面布局
│   └── page.tsx               # 主页面（UI）
├── lib/
│   ├── chunker.ts             # 文本分块器（三种策略）
│   ├── db.ts                  # 数据库连接与操作
│   ├── embeddings.ts          # DeepSeek 嵌入 + AI 问答
│   └── rag.ts                 # RAG 核心工作流
```

改为:
```
│   ├── api/
│   │   ├── chat/route.ts      # 多轮对话 API（新增）
│   │   ├── ingest/route.ts    # 知识入库 API
│   │   ├── query/route.ts     # 知识问答 API
│   │   └── upload/route.ts    # 文件上传 API
│   ├── layout.tsx             # 页面布局
│   └── page.tsx               # 主页面（聊天界面）
├── lib/
│   ├── chat-history.ts        # 聊天历史管理（新增）
│   ├── chunker.ts             # 文本分块器（三种策略）
│   ├── db.ts                  # 数据库连接与操作
│   ├── embeddings.ts          # DeepSeek 嵌入 + AI 问答
│   └── rag.ts                 # RAG 核心工作流
```

---

### 8. 修改: `rag-tutorial/docs/06-运行与测试.md`

**修改位置 1 — 标题说明（第 116 行）**:

将:
```
### 步骤 3：提问

在"知识问答"区域，输入问题：
```

改为:
```
### 步骤 3：对话问答（聊天界面）

> 从 rag_3 开始，前端改为聊天界面风格。直接在底部输入框提问即可。

输入问题：
```

**修改位置 2 — 第 119 行的"点击'提问'"**:

将:
```
点击"提问"。等待几秒钟，你会看到 AI 的回答，以及参考来源。
```

改为:
```
按回车或点击"发送"。等待几秒钟，你会看到 AI 的回答出现在聊天列表中。
每条 AI 回答都可以展开查看参考来源。
```

**修改位置 3 — 在 curl 示例后添加新章节（第 158 行之后，6.4 之前）**:

插入以下内容:
```markdown
### 多轮对话测试

你可以通过聊天 API 测试多轮对话。先发起第一轮问题获取 sessionId，然后用它继续追问：

```bash
# 第一轮：创建新对话
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "什么是 RAG？"}'

# 响应示例：
# {
#   "answer": "RAG 是检索增强生成的缩写...",
#   "sources": ["...", "..."],
#   "sessionId": "abc123-def456"
# }

# 第二轮：基于上一轮追问（使用相同的 sessionId）
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "它有什么优点？", "sessionId": "abc123-def456"}'

# 第三轮：继续追问
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "它和传统 AI 有什么区别？", "sessionId": "abc123-def456"}'
```

你会发现第二轮、第三轮的"它"被正确理解为"RAG"。
```

---

### 9. 无需修改
- `package.json` — 不需要新增依赖（`crypto.randomUUID()` 是 Node.js 18+ 内置）
- `tsconfig.json` — 不需要修改
- `.env.local` — 不需要修改
- `lib/db.ts` — 不需要修改
- `lib/chunker.ts` — 不需要修改
- `app/layout.tsx` — 不需要修改
- `app/api/ingest/route.ts` — 不需要修改
- `app/api/query/route.ts` — 不需要修改（向后兼容，自动忽略新的 `sessionId` 字段）
- `app/api/upload/route.ts` — 不需要修改

---

## 验证
```bash
cd /Users/apple/Documents/MyStudy/rag-tutorial
npm run build  # 必须无错误通过
```

## Git 提交
```bash
cd /Users/apple/Documents/MyStudy
git add rag-tutorial/
git commit -m "feat(rag_3): 新增对话式 RAG - 多轮对话与历史管理

- 实现聊天会话管理 (create/get/add/trim)
- 对话 API 支持多轮上下文
- 前端改为聊天界面风格
- 保留 rag_2 文件上传功能
- 新增教学文档"
```
