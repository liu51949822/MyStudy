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
 *   (1) 嵌入：文本 → 向量（DeepSeek API）
 *   (2) 存储/检索：向量 → pgvector（PostgreSQL）
 *   (3) 召回：找到最相似的 K 条记录
 *   (4) 生成：把资料和问题一起喂给 AI
 */

import { getEmbedding, askAIWithContext } from "./embeddings";
import { insertDocument, searchSimilarDocuments, hybridSearch, initDB } from "./db";
import { chunkText, type ChunkStrategy } from "./chunker";
import {
  createSession,
  getSession,
  addMessage,
  getRecentMessages,
} from "./chat-history";

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
 * 2. 每一块分别发给 DeepSeek，生成向量
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
 * 4. 把"参考资料 + 问题 + 历史对话"一起发给 AI
 * 5. AI 基于参考资料和历史回答
 * 6. 保存本轮问答到历史记录
 *
 * @param question  - 用户的问题
 * @param sessionId - 可选的会话 ID（用于多轮对话）
 * @returns AI 的回答、相关来源、会话 ID
 */
export async function query(
  question: string,
  sessionId?: string
): Promise<{
  answer: string;
  sources: string[];
  sessionId: string;
}> {
  console.log("🔍 正在处理查询...");

  // 步骤 0: 会话管理
  // 如果有 sessionId 且存在，使用已有的；否则创建新的
  if (!sessionId || !getSession(sessionId)) {
    sessionId = createSession();
    console.log(`🆕 创建新会话: ${sessionId}`);
  } else {
    console.log(`💬 继续会话: ${sessionId}`);
  }

  // 获取最近的历史消息（最多 6 条 = 3 轮对话）
  const history = getRecentMessages(sessionId, 6);
  if (history.length > 0) {
    console.log(`📝 加载了 ${history.length} 条历史消息`);
  }

  // 步骤 1: 把问题转换成向量（和存入时用同样的模型）
  console.log("🔮 正在生成问题的嵌入向量...");
  const questionEmbedding = await getEmbedding(question);

  // 步骤 2: 混合搜索 —— 向量搜索 + 关键词搜索
  // 为什么用混合搜索？
  // - 纯向量搜索：找到意思最接近的（语义匹配）
  // - 纯关键词搜索：找到字面匹配的（精确匹配）
  // - 混合搜索：两者结合，效果更好
  console.log("📚 正在进行混合搜索...");
  const similarDocs = await hybridSearch(questionEmbedding, question, 5);

  if (similarDocs.length === 0) {
    const answer = "知识库中还没有内容，请先存入一些文本。";
    // 即使回答为空，也保存到历史
    addMessage(sessionId, "user", question);
    addMessage(sessionId, "assistant", answer);
    return { answer, sources: [], sessionId };
  }

  // 步骤 3: 拼接参考资料（前 3 条）
  const context = similarDocs.map((doc) => doc.content).join("\n---\n");

  // 步骤 4: AI 基于资料和历史回答问题
  console.log("🤖 AI 正在思考...");
  const answer = await askAIWithContext(question, context, history);

  // 步骤 5: 保存本轮问答到历史
  addMessage(sessionId, "user", question);
  addMessage(sessionId, "assistant", answer);
  console.log("💾 已保存到对话历史");

  // 返回回答、相关来源和会话 ID
  return {
    answer,
    sources: similarDocs.map((doc) => doc.content),
    sessionId,
  };
}
