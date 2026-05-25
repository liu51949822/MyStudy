import OpenAI from "openai";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({ model: "text-embedding-3-small", input: text });
  return res.data[0].embedding;
}

export async function askAIWithContext(question: string, context: string): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "你是一个知识库助手。请基于资料来回答。如果资料里没有相关信息，请说"资料库中未找到相关信息"。回答要简洁、准确。" },
      { role: "user", content: \`=== 参考资料 ===\n\${context}\n\n=== 用户问题 ===\n\${question}\` },
    ],
    temperature: 0.3,
  });
  return res.choices[0]?.message?.content || "抱歉，无法生成回答。";
}

export { getOpenAI };
