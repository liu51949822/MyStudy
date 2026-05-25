/**
 * ============================================
 * MCP 工具系统 — lib/tools/tools.ts
 * ============================================
 *
 * 什么是 MCP？
 * MCP = Model Context Protocol（模型上下文协议）
 * 它是一个标准化的方式，让 AI 模型可以调用外部工具。
 *
 * 简单说：AI 不仅能"说话"，还能"做事"。
 *
 * 比如用户问"帮我查一下 RAG 的资料"：
 *   1. AI 决定调用 rag_search 工具
 *   2. 工具执行搜索
 *   3. AI 基于搜索结构回答
 *
 * 这就是 MCP 的核心：AI → Tool → 结果 → AI 回答
 */

import { getEmbedding } from "../embeddings";
import { hybridSearch } from "../db";

/**
 * MCP 工具定义
 *
 * 每个工具包含：
 * - name: 工具名称（AI 用这个名字调用）
 * - description: 工具说明（AI 看了这个决定是否调用）
 * - parameters: 参数描述（告诉 AI 传什么参数）
 * - handler: 实际执行函数
 */
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (args: Record<string, any>) => Promise<any>;
}

/**
 * 工具注册表
 *
 * 所有可用工具都在这里注册。
 * 添加新工具只需要在 toolsMap 新增一个条目。
 */
const toolsMap = new Map<string, MCPTool>();

/**
 * 注册工具
 */
export function registerTool(tool: MCPTool): void {
  toolsMap.set(tool.name, tool);
  console.log(`🔧 已注册工具: ${tool.name}`);
}

/**
 * 执行工具调用
 *
 * @param toolName - 工具名称
 * @param args - 参数字典
 * @returns 工具执行结果
 */
export async function executeTool(
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  const tool = toolsMap.get(toolName);
  if (!tool) {
    throw new Error(`未知工具: ${toolName}`);
  }
  console.log(`🔧 执行工具: ${toolName}`, args);
  return await tool.handler(args);
}

/**
 * 获取所有工具定义（OpenAI 兼容格式）
 */
export function getToolDefinitions(): any[] {
  const definitions: any[] = [];
  for (const tool of toolsMap.values()) {
    definitions.push({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    });
  }
  return definitions;
}

/**
 * 获取工具列表
 */
export function getTools(): MCPTool[] {
  return Array.from(toolsMap.values());
}

// ========== 注册默认工具 ==========

/**
 * rag_search — 知识库搜索工具
 *
 * AI 用这个工具在知识库中搜索相关文档。
 * 和用户在 UI 上提问效果一样，但 AI 可以自主决定何时搜索。
 */
registerTool({
  name: "rag_search",
  description: "在知识库中搜索与查询相关的文档。当你需要回答用户问题时，先用这个工具搜索相关资料。",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "搜索关键词或问题，尽量详细",
      },
      top_k: {
        type: "number",
        description: "返回的结果数量（默认 3）",
        default: 3,
      },
    },
    required: ["query"],
  },
  handler: async (args: Record<string, any>) => {
    const query = String(args.query);
    const topK = Number(args.top_k) || 3;

    // 1. 生成向量
    const embedding = await getEmbedding(query);

    // 2. 混合搜索（向量 + 关键词）
    const results = await hybridSearch(embedding, query, topK);

    return {
      results: results.map((r) => ({
        id: r.id,
        content: r.content,
        score: r.score,
      })),
      total: results.length,
    };
  },
});

/**
 * rag_get_document — 获取完整文档内容
 *
 * 搜索返回的内容可能被截断，
 * 用这个工具可以获取完整内容。
 */
registerTool({
  name: "rag_get_document",
  description: "根据文档 ID 获取完整的文档内容。当搜索结果截断时，用这个工具获取完整文本。",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "number",
        description: "文档 ID",
      },
    },
    required: ["id"],
  },
  handler: async (args: Record<string, any>) => {
    const { pool } = await import("../db");
    const id = Number(args.id);
    const result = await pool.query(
      "SELECT id, content FROM documents WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return { error: "未找到该文档" };
    }
    return { document: result.rows[0] };
  },
});
