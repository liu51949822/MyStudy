/**
 * ============================================
 * 嵌入向量层 — lib/embeddings.ts
 * ============================================
 *
 * 这个文件负责调用 DeepSeek 的 API 来生成"嵌入向量"，
 * 以及通过 Skill 系统执行不同的 AI 能力。
 */

import OpenAI from "openai";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });
}

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "deepseek-embedding",
    input: text,
  });
  return response.data[0].embedding;
}

export async function askAIWithContext(
  question: string,
  context: string,
  history?: { role: string; content: string }[],
  useTools: boolean = true,
  skillId: string = "qa"
): Promise<string> {
  const { getSkill } = await import("@/lib/skills/registry");
  const skill = getSkill(skillId);

  if (skill) {
    console.log(`🧩 使用技能: ${skill.name}`);
    const result = await skill.execute({ question, context, history });
    return result.answer;
  }

  // 降级：找不到技能时用默认方式
  const messages: any[] = [
    {
      role: "system",
      content: `你是一个知识库助手。请基于资料来回答用户的问题。
如果资料里没有相关信息，请说"资料库中未找到相关信息"。回答要简洁、准确。`,
    },
  ];

  if (history?.length) {
    messages.push(...history.filter((m) => m.role === "user" || m.role === "assistant"));
  }

  messages.push({
    role: "user",
    content: `=== 参考资料 ===\n${context}\n\n=== 用户问题 ===\n${question}`,
  });

  let tools: any[] | undefined;
  if (useTools) {
    const { getToolDefinitions } = await import("@/lib/tools/tools");
    const mcpTools = getToolDefinitions();
    if (mcpTools.length > 0) tools = mcpTools;
  }

  const response = await getOpenAI().chat.completions.create({
    model: "deepseek-chat",
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.3,
  });

  const responseMessage = response.choices[0]?.message;
  if (!responseMessage?.tool_calls?.length) {
    return responseMessage?.content || "抱歉，无法生成回答。";
  }

  messages.push(responseMessage);
  const { executeTool } = await import("@/lib/tools/tools");
  for (const toolCall of responseMessage.tool_calls) {
    const args = JSON.parse(toolCall.function.arguments || "{}");
    try {
      const result = await executeTool(toolCall.function.name, args);
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
    } catch (error: any) {
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: `失败: ${error.message}` });
    }
  }

  const finalResponse = await getOpenAI().chat.completions.create({
    model: "deepseek-chat", messages, temperature: 0.3,
  });
  return finalResponse.choices[0]?.message?.content || "抱歉，无法生成回答。";
}

export { getOpenAI };
