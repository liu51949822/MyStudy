/**
 * POST /api/mcp
 *
 * MCP (Model Context Protocol) 端点
 *
 * 这个端点按照 MCP 协议的格式提供工具调用能力。
 * AI 模型可以通过这个接口调用 RAG 功能。
 *
 * 请求格式（JSON-RPC 风格）：
 * {
 *   "method": "tools/call",
 *   "params": {
 *     "name": "rag_search",
 *     "arguments": { "query": "什么是RAG", "top_k": 3 }
 *   }
 * }
 *
 * 响应格式：
 * {
 *   "content": [
 *     { "type": "text", "text": "查询结果..." }
 *   ],
 *   "isError": false
 * }
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * 处理 MCP tools/call 请求
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, params } = body;

    if (method !== "tools/call") {
      return NextResponse.json(
        { error: `不支持的方法: ${method}` },
        { status: 400 }
      );
    }

    const { name, arguments: args } = params;

    if (!name) {
      return NextResponse.json(
        { error: "请提供工具名称 (name)" },
        { status: 400 }
      );
    }

    // 动态导入工具模块
    const { executeTool } = await import("@/lib/tools/tools");
    const result = await executeTool(name, args || {});

    return NextResponse.json({
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
      isError: false,
    });
  } catch (error) {
    console.error("MCP 调用失败:", error);
    const msg = error instanceof Error ? error.message : "MCP 调用失败";
    return NextResponse.json(
      {
        content: [{ type: "text", text: msg }],
        isError: true,
      },
      { status: 500 }
    );
  }
}
