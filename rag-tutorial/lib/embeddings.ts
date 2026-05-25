/**
 * ============================================
 * 嵌入向量层 — lib/embeddings.ts
 * ============================================
 *
 * 这个文件负责调用 DeepSeek 的 API 来生成"嵌入向量"。
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
 * - deepseek-embedding: DeepSeek 的嵌入模型
 *   - 输出 1536 维向量
 *   - 性价比极高，适合入门
 * - deepseek-chat: 轻量级 GPT 模型，用于生成最终答案
 *   - 速度快，成本低，适合教学场景
 */

import OpenAI from "openai";

/**
 * DeepSeek 客户端（懒加载）
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
 * 1. 把文本发给 DeepSeek 的 embedding API
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
 * 传统的 AI 提问：
 *   Q: "什么是 RAG？"
 *   A: "RAG 是检索增强生成..."（模型凭记忆回答）
 *
 * RAG 的方式：
 *   1. 先去"知识库"里搜索相关文档
 *   2. 把搜到的文档作为"参考资料"放进提示词
 *   3. 让 AI 基于这些资料来回答
 *
 * 好处：
 * - 回答更准确，有依据
 * - 可以结合私有知识（公司文档、产品手册等）
 * - 减少 AI 胡编乱造（幻觉）
 *
 * @param question - 用户的问题
 * @param context - 从知识库检索到的相关文档
 * @returns AI 生成的回答
 */
export async function askAIWithContext(
  question: string,
  context: string
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
  const response = await getOpenAI().chat.completions.create({
    model: "deepseek-chat",
    messages: [
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
    ],
    temperature: 0.3, // 较低的温度 = 更确定的回答，减少幻觉
  });

  return response.choices[0]?.message?.content || "抱歉，无法生成回答。";
}

export { getOpenAI };
