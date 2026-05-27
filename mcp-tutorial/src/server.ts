import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "mcp-tutorial-server", version: "0.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "greeting",
      description: "生成个性化问候语",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "名字" },
          language: { type: "string", enum: ["zh", "en"], description: "语言" },
        },
        required: ["name"],
      },
    },
    {
      name: "calculator",
      description: "执行数学计算",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number", description: "第一个数字" },
          b: { type: "number", description: "第二个数字" },
          op: { type: "string", enum: ["add", "sub", "mul", "div"], description: "运算符" },
        },
        required: ["a", "b", "op"],
      },
    },
    {
      name: "echo",
      description: "返回你输入的内容",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "要回显的文字" },
        },
        required: ["text"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "greeting": {
      const msg = args?.language === "en" ? "Hello" : "你好";
      return { content: [{ type: "text", text: `${msg}, ${args?.name}!` }] };
    }
    case "calculator": {
      const a = Number(args?.a), b = Number(args?.b);
      const ops: Record<string, number> = { add: a+b, sub: a-b, mul: a*b, div: b !== 0 ? a/b : NaN };
      const result = ops[args?.op as string];
      return { content: [{ type: "text", text: String(result ?? "无效操作") }] };
    }
    case "echo":
      return { content: [{ type: "text", text: String(args?.text ?? "") }] };
    default:
      throw new Error(`未知工具: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
