import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

/**
 * 生产级 MCP Server
 * 
 * 特性：
 * - 错误处理
 * - 日志记录
 * - 输入验证
 * - 类型安全
 */

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

const todos: Todo[] = [];
let nextId = 1;

const server = new Server(
  { name: "todo-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_todos",
      description: "列出所有待办事项",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "add_todo",
      description: "添加待办事项",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string", minLength: 1, maxLength: 200 } },
        required: ["text"],
      },
    },
    {
      name: "toggle_todo",
      description: "切换待办完成状态",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_todos":
        return { content: [{ type: "text", text: JSON.stringify(todos, null, 2) }] };

      case "add_todo": {
        const text = String(args?.text ?? "").trim();
        if (text.length < 1) throw new Error("内容不能为空");
        const todo: Todo = { id: String(nextId++), text, done: false };
        todos.push(todo);
        return { content: [{ type: "text", text: `✅ 已添加: ${text}` }] };
      }

      case "toggle_todo": {
        const todo = todos.find(t => t.id === args?.id);
        if (!todo) throw new Error(`未找到 ID: ${args?.id}`);
        todo.done = !todo.done;
        return { content: [{ type: "text", text: `✅ 已切换: ${todo.text} (${todo.done ? "完成" : "未完成"})` }] };
      }

      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error: any) {
    return { content: [{ type: "text", text: `❌ 错误: ${error.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("✅ Todo MCP Server 已启动");
