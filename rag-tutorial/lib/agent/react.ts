/**
 * ============================================
 * ReAct Agent — lib/agent/react.ts
 * ============================================
 *
 * 什么是 ReAct？
 * ReAct = Reasoning + Acting（推理 + 行动）
 *
 * 传统 AI：用户提问 → AI 回答（一次完成）
 * ReAct Agent：用户提问 → AI 思考 → 行动 → 观察 → 再思考 → ... → 回答
 *
 * 就像人类解决问题：
 * 1. 思考：我需要查一下资料
 * 2. 行动：打开 Google 搜索
 * 3. 观察：看到了搜索结果
 * 4. 思考：这些信息够了吗？
 * 5. 如果不够：再次搜索
 * 6. 如果够了：整理答案
 *
 * ReAct 的循环：
 *   Thought（思考）→ Action（行动）→ Observation（观察）→ Thought → ... → Final Answer
 */

import OpenAI from "openai";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY });
}

const REACT_SYSTEM_PROMPT = `你是一个可以自主思考和行动的 AI 助手。

## 工作方式
你需要按照以下步骤思考问题：

Thought: 思考当前情况，决定下一步做什么
Action: 选择一个工具并给出参数
Observation: 观察工具返回的结果
...（可以重复 Thought → Action → Observation 多个回合）
Thought: 我现在有足够的信息了
Final Answer: 给出最终回答

## 可用工具
- rag_search(query: string, top_k?: number): 在知识库中搜索资料
- rag_get_document(id: number): 获取完整文档内容

## 规则
1. 每次只做一个 Action
2. 观察结果后决定下一步
3. 当信息足够时，给出 Final Answer
4. 如果工具返回错误，尝试其他方法
5. 必须基于搜索结果回答，不要编造`;

/**
 * 使用 ReAct 模式执行 Agent 任务
 *
 * @param question - 用户的问题
 * @param maxSteps - 最大推理步数（防止无限循环）
 * @returns Agent 的最终回答
 */
export async function reactAgent(
  question: string,
  maxSteps: number = 5
): Promise<string> {
  interface ToolResult {
    name: string;
    result: string;
  }

  const messages: any[] = [
    { role: "system", content: REACT_SYSTEM_PROMPT },
    { role: "user", content: question },
  ];

  const toolResults: ToolResult[] = [];

  for (let step = 0; step < maxSteps; step++) {
    console.log(`🤖 ReAct 步骤 ${step + 1}/${maxSteps}`);

    const response = await getOpenAI().chat.completions.create({
      model: "deepseek-chat",
      messages,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || "";
    console.log(`  思考: ${content.slice(0, 100)}...`);

    // 检查是否给出最终答案
    if (content.includes("Final Answer:")) {
      const finalAnswer = content.split("Final Answer:")[1]?.trim() || content;
      console.log("✅ Agent 得出最终结论");
      return finalAnswer;
    }

    // 解析 Action
    const actionMatch = content.match(/Action:\s*(\w+)\s*\(([^)]*)\)/);
    if (!actionMatch) {
      // AI 既没有给出 Final Answer 也没有 Action
      // 把 AI 的思考加入消息继续
      messages.push({ role: "assistant", content });
      continue;
    }

    const toolName = actionMatch[1];
    const argsString = actionMatch[2];

    // 解析参数
    const args: Record<string, any> = {};
    const argPairs = argsString.split(",");
    for (const pair of argPairs) {
      const [key, ...valParts] = pair.trim().split(":");
      if (key && valParts.length > 0) {
        let val = valParts.join(":").trim().replace(/^["']|["']$/g, "");
        // 尝试转数字
        const num = Number(val);
        if (!isNaN(num) && val !== "") args[key.trim()] = num;
        else args[key.trim()] = val;
      }
    }

    // 执行工具
    console.log(`  行动: ${toolName}(${argsString})`);
    let observation = "";
    try {
      const { executeTool } = await import("@/lib/tools/tools");
      const result = await executeTool(toolName, args);
      observation = JSON.stringify(result).slice(0, 1000);
      toolResults.push({ name: toolName, result: observation });
    } catch (error: any) {
      observation = `错误: ${error.message}`;
    }
    console.log(`  观察: ${observation.slice(0, 80)}...`);

    // 把 AI 的思考和工具结果加入消息
    messages.push({ role: "assistant", content });
    messages.push({ role: "user", content: `Observation: ${observation}` });
  }

  // 达到最大步数还没得出结论

  const response = await getOpenAI().chat.completions.create({
    model: "deepseek-chat",
    messages: [
      ...messages,
      {
        role: "user",
        content:
          "你已经达到最大思考步数。请基于已经获取的信息给出最终回答。",
      },
    ],
    temperature: 0.3,
  });

  return (
    response.choices[0]?.message?.content ||
    "抱歉，无法在限定步数内完成分析。"
  );
}
