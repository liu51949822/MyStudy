import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema, ListToolsRequestSchema,
  ListResourcesRequestSchema, ReadResourceRequestSchema,
  ListPromptsRequestSchema, GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "mcp-tutorial-server", version: "0.3.0" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

// ===== Resources（资源） =====
// Resource 是 MCP 中的"数据提供者"
// 类比：文件系统（读取文件内容）
const notes: Record<string, string> = {
  "mcp-intro": "MCP 是 Model Context Protocol 的缩写",
  "types-intro": "TypeScript 是 JavaScript 的超集",
};

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: Object.keys(notes).map(id => ({
    uri: `note:///${id}`,
    name: id,
    description: `笔记: ${id}`,
    mimeType: "text/plain",
  })),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const id = request.params.uri.replace("note:///", "");
  const text = notes[id];
  if (!text) throw new Error(`Not found: ${id}`);
  return { contents: [{ uri: request.params.uri, mimeType: "text/plain", text }] };
});

// ===== Tools =====
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "say",
      description: "说一句话",
      inputSchema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return { content: [{ type: "text", text: String(request.params.arguments?.message) }] };
});

// ===== Prompts（提示词模板） =====
// Prompt 是 MCP 中的"提示词模板"
// 类比：预定义的 AI 对话模板
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "explain",
      description: "解释一个概念",
      arguments: [{ name: "topic", description: "要解释的概念", required: true }],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "explain") {
    return {
      messages: [
        { role: "user", content: { type: "text", text: `请用简单的话解释: ${request.params.arguments?.topic}` } },
      ],
    };
  }
  throw new Error("Unknown prompt");
});

const transport = new StdioServerTransport();
await server.connect(transport);
