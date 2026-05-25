import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "请提供有效的 content 字段" }, { status: 400 });
    }
    const { ingest } = await import("@/lib/rag");
    const message = await ingest(content);
    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json({ error: "入库失败" }, { status: 500 });
  }
}
