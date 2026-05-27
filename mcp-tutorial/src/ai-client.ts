import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import OpenAI from "openai";

/**
 * AI + MCP 集成示例
 * 
 * 让 AI 模型通过 MCP 调用外部工具。
 * 这里用 DeepSeek 作为 AI 模型。
 */
async function main() {
  // 1. 连接 MCP Server
  const client = new Client({ name: "ai-client", version: "0.6.0" }, {});
  const transport = new StdioClientTransport({
    command: "npx", args: ["tsx", "src/server.ts"],
  });
  await client.connect(transport);

  // 2. 获取 MCP 工具列表，转换为 OpenAI 工具格式
  const tools = await client.listTools();
  const openaiTools = tools.tools.map(t => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));

  // 3. 初始化 DeepSeek 客户端
  const ai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });

  // 4. 用户问题
  const messages: any[] = [
    { role: "user", content: "说一句问候，然后计算 123 + 456" },
  ];

  // 5. AI 思考并决定调用工具
  const response = await ai.chat.completions.create({
    model: "deepseek-chat",
    messages,
    tools: openaiTools,
    tool_choice: "auto",
  });

  const msg = response.choices[0].message;

  // 6. 如果 AI 调用了工具，执行并返回结果
  if (msg.tool_calls) {
    messages.push(msg);
    for (const call of msg.tool_calls) {
      const result = await client.callTool({
        name: call.function.name,
        arguments: JSON.parse(call.function.arguments),
      });
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.content[0].text,
      });
    }

    // 7. AI 基于工具结果生成最终回答
    const final = await ai.chat.completions.create({
      model: "deepseek-chat",
      messages,
    });
    console.log("🤖 AI 回答:", final.choices[0].message.content);
  }

  await client.close();
}

main().catch(console.error);
