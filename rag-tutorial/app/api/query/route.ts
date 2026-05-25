import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/rag";

/**
 * POST /api/query
 *
 * 知识问答接口
 *
 * 请求体格式：
 * {
 *   "question": "你的问题..."
 * }
 *
 * 响应格式：
 * {
 *   "answer": "AI 基于知识库的回答...",
 *   "sources": ["相关文档1", "相关文档2", ...]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

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

    const result = await query(question);

    return NextResponse.json(result);
  } catch (error) {
    console.error("查询失败:", error);
    return NextResponse.json(
      { error: "查询失败，请检查控制台日志" },
      { status: 500 }
    );
  }
}
