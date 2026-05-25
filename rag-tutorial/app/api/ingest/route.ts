import { NextRequest, NextResponse } from "next/server";
import { ingest } from "@/lib/rag";

/**
 * POST /api/ingest
 *
 * 知识入库接口
 *
 * 请求体格式：
 * {
 *   "content": "要存入知识库的文本内容..."
 * }
 *
 * 响应格式：
 * {
 *   "message": "✅ 文本已成功存入知识库！"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "请提供 content 字段（字符串类型）" },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: "content 不能为空" },
        { status: 400 }
      );
    }

    const message = await ingest(content);

    return NextResponse.json({ message });
  } catch (error) {
    console.error("入库失败:", error);
    return NextResponse.json(
      { error: "入库失败，请检查控制台日志" },
      { status: 500 }
    );
  }
}
