/**
 * MCP 教程 - 第 1 课
 * 
 * 最简单的 MCP Server
 * 
 * 什么是 MCP？
 * MCP = Model Context Protocol
 * 它是一个让 AI 应用可以调用外部工具的标准化协议。
 * 
 * 可以把 MCP 理解为"AI 的 USB 接口"：
 * - USB 让设备可以插上各种外设（键盘、鼠标、U盘）
 * - MCP 让 AI 可以接上各种工具（搜索、计算、数据库）
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * 1. 创建 MCP Server 实例
 * 
 * 参数：
 * - name: 服务器名称
 * - version: 版本号
 * - capabilities: 能力声明（声明这个服务器支持什么）
 */
const server = new Server(
  {
    name: "mcp-tutorial-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {}, // 声明支持 tools 能力
    },
  }
);

/**
 * 2. 定义工具
 * 
 * ListToolsRequestSchema: 当客户端询问"你有什么工具？"时触发
 * 返回所有可用工具的定义
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "hello",
        description: "一个简单的问候工具",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "你的名字",
            },
          },
          required: ["name"],
        },
      },
    ],
  };
});

/**
 * 3. 执行工具
 * 
 * CallToolRequestSchema: 当客户端调用工具时触发
 * 根据工具名称执行对应的逻辑
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "hello") {
    return {
      content: [
        {
          type: "text",
          text: `你好, ${args?.name || "世界"}！欢迎来到 MCP 世界！`,
        },
      ],
    };
  }

  throw new Error(`未知工具: ${name}`);
});

/**
 * 4. 启动服务器
 * 
 * StdioServerTransport: 通过标准输入/输出通信
 * 这是 MCP 最常用的传输方式
 * 
 * 启动方式：
 *   npm run dev
 *   或
 *   npx tsx src/server.ts
 */
const transport = new StdioServerTransport();
await server.connect(transport);
console.log("✅ MCP Server 已启动 (stdio)");
