/**
 * ============================================
 * 嵌入向量层 — lib/embeddings.ts
 * ============================================
 *
 * 这个文件负责调用 DeepSeek 的 API 来生成"嵌入向量"。
 * 以及通过 MCP 工具系统实现"AI 自主调用工具"。
 *
 * 什么是 MCP 工具调用？
 * 普通的 AI：你说一句，AI 答一句
 * MCP 工具：AI 可以决定"我需要查一下资料"，然后自动调用工具
 *
 * 流程：
 * 1. 用户提问 → 发给 AI
 * 2. AI 说：我需要用 rag_search 工具查资料
 * 3. 系统执行工具，把结果返回给 AI
 * 4. AI 基于工具结果生成回答
 */

import OpenAI from "openai";

/**
 * DeepSeek 客户端（懒加载）
 */
function getOpenAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
}

/**
 * 生成文本的嵌入向量
 */
export async function getEmbedding(text: string): Promise<number[]> {
    const response = await getOpenAI().embeddings.create({
    model: "deepseek-embedding",
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * 用 RAG + MCP 工具方式向 AI 提问
 *
 * 这个版本支持 AI 自主调用 MCP 工具。
 * 流程：
 *   Round 1:
 *     用户问题 + 可用工具 → AI
 *     AI → "我查一下资料" → 调用工具
 *   Round 2:
 *     用户问题 + 工具结果 → AI
 *     AI → 生成最终回答
 *
 * @param question - 用户的问题
 * @param context - 从知识库检索到的相关文档
 * @param history - 可选的对话历史
 * @param useTools - 是否启用 MCP 工具（默认 true）
 * @returns AI 生成的回答
 */
export async function askAIWithContext(
  question: string,
  context: string,
  history?: { role: string; content: string }[],
  useTools: boolean = true
): Promise<string> {
  const messages: any[] = [
    {
      role: "system",
      content: `你是一个知识库助手。请基于以下资料来回答用户的问题。
如果资料里没有相关信息，请说"资料库中未找到相关信息"。
回答要简洁、准确。注意对话的上下文。

在回答前，你可以使用 rag_search 工具来补充查询知识库。
如果你觉得当前资料不够，随时可以调用工具获取更多信息。`,
    },
  ];

  // 插入历史消息
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

  // 如果启用工具，加载工具定义
  let tools: any[] | undefined;
  if (useTools) {
    const { getToolDefinitions } = await import("@/lib/tools/tools");
    const mcpTools = getToolDefinitions();
    if (mcpTools.length > 0) {
      tools = mcpTools;
      console.log("🔧 已加载 MCP 工具:", mcpTools.length);
    }
  }

  // 第一轮：发送消息给 AI，如果有工具则带上
  const response = await getOpenAI().chat.completions.create({
    model: "deepseek-chat",
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.3,
  });

  const responseMessage = response.choices[0]?.message;

  // 如果 AI 没有调用工具，直接返回回答
  if (!responseMessage?.tool_calls || responseMessage.tool_calls.length === 0) {
    return responseMessage?.content || "抱歉，无法生成回答。";
  }

  // AI 调用了工具！我们需要：
  // 1. 把 AI 的工具调用消息加到历史
  // 2. 执行每个工具
  // 3. 把工具结果加回消息
  // 4. 让 AI 基于工具结果生成最终回答

  console.log(`🔧 AI 调用了 ${responseMessage.tool_calls.length} 个工具`);

  // 把第一轮的消息（含工具调用）加到消息列表
  messages.push(responseMessage);

  // 逐个执行工具
  const { executeTool } = await import("@/lib/tools/tools");
  for (const toolCall of responseMessage.tool_calls) {
    const args = JSON.parse(toolCall.function.arguments || "{}");
    console.log(`🔧 执行工具: ${toolCall.function.name}`);
    try {
      const result = await executeTool(toolCall.function.name, args);
      // 把工具执行结果加回消息
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    } catch (error: any) {
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: `工具执行失败: ${error.message}`,
      });
    }
  }

  // 第二轮：AI 基于工具结果生成最终回答
  const finalResponse = await getOpenAI().chat.completions.create({
    model: "deepseek-chat",
    messages,
    temperature: 0.3,
  });

  return finalResponse.choices[0]?.message?.content || "抱歉，无法生成回答。";
}

export { getOpenAI };
