import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/upload
 *
 * 文件上传接口 — 上传 .txt 或 .md 文件并存入知识库
 *
 * 请求格式：multipart/form-data
 *   字段名: file
 *   支持类型: .txt, .md
 *
 * 响应格式：
 *   { "message": "...", "filename": "example.txt" }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "请上传一个文件（字段名为 file）" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "文件不能为空" },
        { status: 400 }
      );
    }

    const filename = file.name.toLowerCase();
    if (!filename.endsWith(".txt") && !filename.endsWith(".md")) {
      return NextResponse.json(
        { error: "不支持的文件格式，请上传 .txt 或 .md 文件" },
        { status: 400 }
      );
    }

    const text = await file.text();

    if (!text.trim()) {
      return NextResponse.json(
        { error: "文件内容为空" },
        { status: 400 }
      );
    }

    console.log(`📄 正在处理文件: ${file.name} (${file.size} bytes)`);

    const { ingest } = await import("@/lib/rag");
    const message = await ingest(text);

    console.log(`✅ 文件 ${file.name} 处理完成`);

    return NextResponse.json({ message, filename: file.name });
  } catch (error) {
    console.error("文件上传失败:", error);
    return NextResponse.json(
      { error: "文件上传处理失败，请检查控制台日志" },
      { status: 500 }
    );
  }
}
