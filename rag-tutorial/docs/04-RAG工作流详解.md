# 📖 第 4 课：RAG 工作流详解

## 4.1 完整流程图

```
                    ╔═══════════════════════════════╗
                    ║      1. 知识入库 (Ingest)     ║
                    ╚═══════════════════════════════╝

  ┌──────────┐     ┌──────────────┐     ┌──────────┐
  │ 用户提交  │     │ 文本 → 向量  │     │ 存入 PG  │
  │ 文本内容  │────▶│ (DeepSeek)    │────▶│ (pgvector)│
  └──────────┘     └──────────────┘     └──────────┘


                    ╔═══════════════════════════════╗
                    ║      2. 知识问答 (Query)      ║
                    ╚═══════════════════════════════╝

  ┌──────────┐     ┌──────────────┐     ┌──────────────┐
  │ 用户提问  │     │ 问题 → 向量  │     │ 向量搜索    │
  │ "什么是   │────▶│ (DeepSeek)    │────▶│ (pgvector)   │
  │  RAG？"  │     └──────────────┘     └──────┬───────┘
  └──────────┘                                  │
                                                ▼
                                        ┌──────────────┐
                                        │ 找到 3 条最  │
                                        │ 相关文档     │
                                        └──────┬───────┘
                                               │
                                               ▼
  ┌──────────┐     ┌──────────────────────────────┐
  │ 返回给   │◀────│ AI 基于阅读资料后生成回答     │
  │ 用户     │     │ (GPT + 参考文档)              │
  └──────────┘     └──────────────────────────────┘
```

## 4.2 知识入库（Ingest）详细流程

### 代码位置：`lib/rag.ts` 中的 `ingest()` 函数

```typescript
export async function ingest(content: string): Promise<string> {
  // 步骤 1: 把文本转换成向量
  const embedding = await getEmbedding(content);

  // 步骤 2: 把文本和向量一起存入数据库
  await insertDocument(content, embedding);

  return "✅ 文本已成功存入知识库！";
}
```

### 背后的网络请求

```
你的服务器 ──── 1. POST embedding API ───────▶ DeepSeek
             ◀─── 返回 [0.025, -0.613, ...] ──  DeepSeek
             
你的服务器 ──── 2. INSERT INTO documents ────▶ PostgreSQL
             ◀─── INSERT 0 1 ─────────────────  PostgreSQL
```

### 数据入库后的样子

在 psql 中查看：

```sql
rag_tutorial=# SELECT id, LEFT(content, 40) AS content_preview FROM documents;

 id |              content_preview
----+------------------------------------------
  1 | RAG 是检索增强生成（Retrieval-Augmented...
  2 | 嵌入向量（Embedding）是把文本转换成数字...
(2 rows)
```

## 4.3 知识问答（Query）详细流程

### 代码位置：`lib/rag.ts` 中的 `query()` 函数

```typescript
export async function query(question: string) {
  // 步骤 1: 把问题转成向量
  const questionEmbedding = await getEmbedding(question);

  // 步骤 2: 在知识库里找最相似的 3 条
  const similarDocs = await searchSimilarDocuments(questionEmbedding, 3);

  // 步骤 3: 把找到的文档拼成"参考资料"
  const context = similarDocs.map(doc => doc.content).join("\n---\n");

  // 步骤 4: 让 AI 基于资料回答问题
  const answer = await askAIWithContext(question, context);

  return { answer, sources: similarDocs.map(doc => doc.content) };
}
```

### 分步拆解

**步骤 1：问题 → 向量**
```
输入："RAG 是什么意思？"
输出：[0.045, -0.589, 0.412, ...]  (1536 个数字)
```

**步骤 2：向量搜索（在 PostgreSQL 中）**

```sql
SELECT content, embedding <=> '[0.045, -0.589, ...]'::vector AS distance
FROM documents
ORDER BY distance ASC
LIMIT 3;
```

结果可能是：
| content | distance |
|---------|----------|
| "RAG 是检索增强生成的缩写..." | 0.12 |
| "RAG 的核心思想是..." | 0.15 |
| "嵌入向量是把文本变成数字..." | 0.45 |

距离越小 = 越相关。前两条讲 RAG 的文档距离很小（高度相关），
第三条讲嵌入向量的距离较大（部分相关）。

**步骤 3：拼接参考资料**

```
参考资料：
"RAG 是检索增强生成的缩写"
---
"RAG 的核心思想是先检索相关资料"
---
"嵌入向量是把文本变成数字表示"
```

**步骤 4：AI 生成答案**

发给 GPT 的最终 prompt 类似：

```
系统提示：你是一个知识库助手。请基于以下资料来回答...

参考资料：
RAG 是检索增强生成的缩写...

用户问题：
RAG 是什么意思？

---
GPT 回答：
RAG 是 Retrieval-Augmented Generation 的缩写，
中文叫"检索增强生成"...
```

## 4.4 RAG 的关键要点

### 要点 1：嵌入一致性

> **存入和查询必须使用同一个模型！**

如果用 deepseek-embedding 存数据，
就必须用同一个模型来转问题。

不同模型的向量"坐标系"不同，无法混用。

### 要点 2：Top-K 的选择

```typescript
const similarDocs = await searchSimilarDocuments(questionEmbedding, 3);
```

`K=3` 表示取最相似的 3 条。K 值的选择：

| K 值 | 效果 | 适合场景 |
|------|------|---------|
| 1 | 只依赖一条资料 | 答案很精确但不全面 |
| 3 | 平衡准确和全面 | ✅ 大多数场景 |
| 5+ | 大量资料 | 需要综合分析时 |

### 要点 3：Token 限制

GPT 模型有"上下文窗口"限制：
- deepseek-chat：128K tokens ≈ 10 万汉字
- 拼接的资料太多可能超出限制
- 所以限制 K 值也是控制上下文大小

### 要点 4：距离度量

我们用的 `<=>` 是余弦距离，取值范围 [0, 2]：
- 0 = 完全一样的方向（非常相似）
- 1 = 垂直（不相关）
- 2 = 完全相反（罕见）

## 4.5 本节总结

RAG 其实就四个步骤：

```
1. 嵌入（Embed）   ─ 文本 → 向量
2. 存储/索引       ─ 向量存数据库
3. 检索（Retrieve）─ 向量搜索找相关文档
4. 生成（Generate） ─ AI 基于文档回答
```

RAG 的英文全称 Retrieval-Augmented Generation 正好对应这四步。

---

**[下一课：API 与前端界面 →](./05-API与前端界面.md)**
