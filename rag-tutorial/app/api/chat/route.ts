import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/chat
 *
 * 多轮对话接口
 *
 * 和 /api/query 的区别：
 * - 支持 sessionId（会话 ID），可以连续对话
 * - AI 能记住之前说了什么
 * - 返回 sessionId，前端需要保存并在下次请求时传入
 *
 * 请求体格式：
 * {
 *   "question": "你的问题...",
 *   "sessionId": "abc-123"    // 可选，不传则创建新会话
 * }
 *
 * 响应格式：
 * {
 *   "answer": "AI 基于知识库和历史对话的回答...",
 *   "sessionId": "abc-123",
 *   "sources": ["相关文档1", "相关文档2", ...]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, sessionId } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "请提供 question 字段（字符串类型）" },
        { status: 400 }
      );
    }

    if (question.trim().length === 0) {
      return NextResponse.json(
        { error: "question 不能为空" },
        { status: 400 }
      );
    }

    // 动态 import：避免构建时 OpenAI 环境变量检查
    const { query } = await import("@/lib/rag");
    const result = await query(question, sessionId || undefined);

    return NextResponse.json(result);
  } catch (error) {
    console.error("对话查询失败:", error);
    return NextResponse.json(
      { error: "对话查询失败，请检查控制台日志" },
      { status: 500 }
    );
  }
}
