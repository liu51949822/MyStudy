/**
 * POST /api/agent
 *
 * Agent 智能体接口 — 使用 ReAct 模式进行多步推理
 *
 * 和 /api/chat 的区别：
 * - AI 可以自主决定查几次资料
 * - 可以组合多个工具完成复杂任务
 * - 会展示思考过程（Thought → Action → Observation）
 *
 * 请求体格式：
 * {
 *   "question": "请帮我研究一下RAG和传统搜索的区别"
 * }
 *
 * 响应格式：
 * {
 *   "answer": "经过多步研究，RAG和传统搜索的主要区别是...",
 *   "steps": 3
 * }
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "请提供 question 字段" },
        { status: 400 }
      );
    }

    const { reactAgent } = await import("@/lib/agent/react");
    const answer = await reactAgent(question);

    return NextResponse.json({ answer, mode: "agent" });
  } catch (error) {
    console.error("Agent 执行失败:", error);
    return NextResponse.json(
      { error: "Agent 执行失败，请检查控制台日志" },
      { status: 500 }
    );
  }
}
