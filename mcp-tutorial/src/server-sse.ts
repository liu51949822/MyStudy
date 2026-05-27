import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";

// SSE (Server-Sent Events) 传输方式
// 通过 HTTP 通信，适合远程访问
const server = new Server(
  { name: "mcp-sse-server", version: "0.4.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(
  { method: "tools/list" },
  async () => ({
    tools: [{
      name: "ping",
      description: "测试连接",
      inputSchema: { type: "object", properties: {} },
    }],
  })
);

server.setRequestHandler(
  { method: "tools/call" },
  async () => ({
    content: [{ type: "text", text: "pong" }],
  })
);

// SSE 启动方式: node dist/server-sse.js
// 客户端通过 HTTP 连接
const transport = new HttpServerTransport({ port: 3001 });
await server.connect(transport);
console.log("✅ MCP SSE Server: http://localhost:3001");
