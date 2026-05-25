/**
 * ============================================
 * RAG 核心逻辑 — lib/rag.ts
 * ============================================
 *
 * 这个文件把前面的功能串起来，组成完整的工作流。
 *
 * RAG 完整流程（记住这张图）：
 *
 *   ┌──────────┐    ┌───────────┐    ┌──────────┐
 *   │ 存入知识  │    │ 用户提问  │    │  AI 回答 │
 *   └────┬─────┘    └─────┬─────┘    └────┬─────┘
 *        │                 │               │
 *        ▼                 ▼               │
 *   ┌──────────┐    ┌───────────┐          │
 *   │ 文本 →   │    │ 问题 →   │          │
 *   │ 向量 (1) │    │ 向量 (1) │          │
 *   └────┬─────┘    └────┬─────┘          │
 *        │               │                │
 *        ▼               ▼                │
 *   ┌──────────┐    ┌───────────┐         │
 *   │ 存入 PG  │    │ 向量搜索  │         │
 *   │ (pgvector)│    │ (2)       │         │
 *   └──────────┘    └────┬─────┘          │
 *                        │                │
 *                        ▼                │
 *                   ┌───────────┐         │
 *                   │ 检索到相关 │         │
 *                   │ 文档 (3)  │         │
 *                   └────┬─────┘          │
 *                        │                │
 *                        ▼                ▼
 *                   ┌──────────────────────┐
 *                   │ 资料 + 问题 → AI 回答 │
 *                   │       (4)            │
 *                   └──────────────────────┘
 *
 *   步骤说明：
 *   (1) 嵌入：文本 → 向量（OpenAI API）
 *   (2) 存储/检索：向量 → pgvector（PostgreSQL）
 *   (3) 召回：找到最相似的 K 条记录
 *   (4) 生成：把资料和问题一起喂给 AI
 */

import { getEmbedding, askAIWithContext } from "./embeddings";
import { insertDocument, searchSimilarDocuments, initDB } from "./db";
import { chunkText, type ChunkStrategy } from "./chunker";

/**
 * 初始化 RAG 系统
 *
 * 这一步必须在开始之前做！
 * 它会创建数据库表，确保一切就绪。
 */
export async function initRAG(): Promise<void> {
  await initDB();
}

/**
 * 知识入库 —— 把文本分块后存入知识库
 *
 * 流程：
 * 1. 用分块器把长文本切成小块
 * 2. 每一块分别发给 OpenAI，生成向量
 * 3. 把"文本块 + 向量"逐条存入 PostgreSQL
 *
 * 为什么需要分块？
 * - 长文本的向量不够精确（被平均了）
 * - 小块检索时能更精准地找到答案所在段落
 * - 嵌入模型有输入长度限制
 *
 * @param content  - 要存入的文本内容
 * @param strategy - 分块策略（默认 "recursive"）
 * @returns 成功消息（含块数）
 *
 * 教学示例：
 *   await ingest("这是一段很长的文本...", "paragraph")
 *   // → ✅ 已成功存入 3 个文本块！
 */
export async function ingest(
  content: string,
  strategy?: ChunkStrategy
): Promise<string> {
  console.log("📥 正在处理入库文本...");

  // 步骤 1: 把文本切成小块
  console.log("✂️ 正在分块...");
  const chunks = chunkText(content, strategy);
  console.log(`   → 共分为 ${chunks.length} 个文本块`);

  // 步骤 2: 对每一个块生成嵌入向量并存入数据库
  for (const chunk of chunks) {
    console.log(`🔮 正在处理第 ${chunk.index + 1}/${chunks.length} 块...`);
    const embedding = await getEmbedding(chunk.content);
    console.log("💾 正在存入数据库...");
    await insertDocument(chunk.content, embedding);
  }

  return `✅ 已成功存入 ${chunks.length} 个文本块！`;
}

/**
 * 知识查询 —— 提问并获取基于知识库的回答
 *
 * 流程：
 * 1. 把问题转换成向量
 * 2. 在数据库中找最相似的 K 条记录
 * 3. 把找到的文本拼接成"参考资料"
 * 4. 把"参考资料 + 问题"一起发给 AI
 * 5. AI 基于参考资料回答
 *
 * @param question - 用户的问题
 * @returns AI 的回答
 *
 * 教学示例：
 *   await query("什么是 RAG？")
 *   // → AI 会基于知识库中的内容回答
 */
export async function query(question: string): Promise<{
  answer: string;
  sources: string[];
}> {
  console.log("🔍 正在处理查询...");

  // 步骤 1: 把问题转换成向量（和存入时用同样的模型）
  console.log("🔮 正在生成问题的嵌入向量...");
  const questionEmbedding = await getEmbedding(question);

  // 步骤 2: 搜索最相似的 3 条记录
  console.log("📚 正在搜索知识库...");
  const similarDocs = await searchSimilarDocuments(questionEmbedding, 3);

  if (similarDocs.length === 0) {
    return {
      answer: "知识库中还没有内容，请先存入一些文本。",
      sources: [],
    };
  }

  // 步骤 3: 拼接参考资料
  const context = similarDocs.map((doc) => doc.content).join("\n---\n");

  // 步骤 4: AI 基于资料回答问题
  console.log("🤖 AI 正在思考...");
  const answer = await askAIWithContext(question, context);

  // 返回回答和相关来源
  return {
    answer,
    sources: similarDocs.map((doc) => doc.content),
  };
}
