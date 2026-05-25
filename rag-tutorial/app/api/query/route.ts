import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;
    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "请提供有效的 question 字段" }, { status: 400 });
    }
    const { query } = await import("@/lib/rag");
    const result = await query(question);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
