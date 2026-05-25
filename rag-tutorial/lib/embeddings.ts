/**
 * ============================================
 * 嵌入向量层 — lib/embeddings.ts
 * ============================================
 *
 * 这个文件负责调用 OpenAI 的 API 来生成"嵌入向量"。
 *
 * 什么是嵌入向量（Embedding）？
 * --------------------------------------------
 * 简单说：把文字变成一串数字（向量）。
 *
 * 比如：
 *   "苹果很好吃" → [0.001, -0.023, 0.457, ...]  (1536 个数字)
 *   "我喜欢吃水果" → [0.015, -0.019, 0.402, ...] (1536 个数字)
 *
 * 神奇的地方：意思相近的文本，它们的向量也"靠得很近"。
 * 这就是 RAG 能工作的数学基础！
 *
 * 用到的模型：
 * - deepseek-embedding: OpenAI 的嵌入模型
 *   - 输出 1536 维向量
 *   - 性价比极高，适合入门
 * - deepseek-chat: 轻量级 GPT 模型，用于生成最终答案
 *   - 速度快，成本低，适合教学场景
 */

import OpenAI from "openai";

/**
 * OpenAI 客户端（懒加载）
 *
 * 为什么不在模块顶层直接 new OpenAI()？
 * 因为 Next.js 在构建时会执行顶层代码，
 * 如果 .env.local 还没配好，就会报错。
 *
 * 懒加载保证了：只在真正需要调用 API 时才创建客户端。
 */
function getOpenAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
}

/**
 * 生成文本的嵌入向量
 *
 * @param text - 要生成向量的文本
 * @returns 1536 维的向量数组
 *
 * 调用流程：
 * 1. 把文本发给 OpenAI 的 embedding API
 * 2. OpenAI 返回一个向量（一堆数字）
 * 3. 我们用这个向量去做相似度搜索
 */
export async function getEmbedding(text: string): Promise<number[]> {
    const response = await getOpenAI().embeddings.create({
    model: "deepseek-embedding",
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * 用 RAG 方式向 AI 提问
 *
 * 这就是 RAG 的核心！
 *
 * 传统的 AI 提问（无历史）：
 *   Q: "什么是 RAG？"
 *   A: "RAG 是检索增强生成..."
 *   Q: "它有什么优点？"
 *   A: "它？什么它？" ← AI 不知道上下文
 *
 * RAG + 历史（多轮对话）：
 *   Q: "什么是 RAG？"
 *   历史：[上一轮 Q&A]
 *   Q: "它有什么优点？"
 *   AI 看历史 → "它" = RAG → 正确回答
 *
 * @param question - 用户的问题
 * @param context - 从知识库检索到的相关文档
 * @param history - 可选的对话历史（用于多轮对话）
 * @returns AI 生成的回答
 */
export async function askAIWithContext(
  question: string,
  context: string,
  history?: { role: string; content: string }[]
): Promise<string> {
  /**
   * System Prompt（系统提示词）
   *
   * 这个提示词告诉 AI 应该扮演什么角色、
   * 以及如何回答问题。
   *
   * 关键点："基于以下资料来回答"——这就是 RAG 的核心约束。
   * AI 只能基于我们给它的资料来回答，不能自己瞎编。
   */

  /**
   * 构造消息数组
   *
   * 多轮对话的关键：把历史消息插入到 system 和 user 之间。
   *
   * 最终发给 AI 的消息结构：
   *   System: 你是一个知识库助手...
   *   Assistant: RAG 是检索增强生成...  ← 历史
   *   User: 它有什么优点？              ← 当前问题
   *   === 参考资料 ===                  ← 检索到的知识库内容
   *   RAG 的优点包括...
   *
   * 这样 AI 就能看到上下文，理解"它"指代什么。
   */
  const messages: any[] = [
    {
      role: "system",
      content: `你是一个知识库助手。请基于以下资料来回答用户的问题。
如果资料里没有相关信息，请说"资料库中未找到相关信息"。
回答要简洁、准确。注意对话的上下文，理解用户的追问意图。`,
    },
  ];

  // 插入历史消息（如果有）
  if (history && history.length > 0) {
    const validHistory = history.filter(
      (m) => m.role === "user" || m.role === "assistant"
    );
    messages.push(...validHistory);
  }

  // 添加当前问题和参考资料
  messages.push({
    role: "user",
    content: `=== 参考资料 ===\n${context}\n\n=== 用户问题 ===\n${question}`,
  });

  const response = await getOpenAI().chat.completions.create({
    model: "deepseek-chat",
    messages,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || "抱歉，无法生成回答。";
}

export { getOpenAI };
