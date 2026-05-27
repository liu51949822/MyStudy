import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * MCP Client 教程
 * 
 * Client 是 MCP 架构中的"消费者"，
 * 它连接 Server，调用 Tools，读取 Resources。
 */
async function main() {
  // 1. 创建 Client
  const client = new Client(
    { name: "mcp-tutorial-client", version: "0.5.0" },
    { capabilities: {} }
  );

  // 2. 连接到 Server（通过 Stdio）
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "src/server.ts"],
  });
  await client.connect(transport);
  console.log("✅ 已连接到 MCP Server");

  // 3. 获取可用工具列表
  const tools = await client.listTools();
  console.log(`🔧 可用工具: ${tools.tools.map(t => t.name).join(", ")}`);

  // 4. 调用工具
  const result = await client.callTool({
    name: "say",
    arguments: { message: "你好，MCP！" },
  });
  console.log("📨 工具调用结果:", result.content[0]);

  // 5. 读取资源
  const resources = await client.listResources();
  console.log(`📚 可用资源: ${resources.resources.map(r => r.name).join(", ")}`);

  if (resources.resources.length > 0) {
    const resource = await client.readResource({ uri: resources.resources[0].uri });
    console.log(`📖 资源内容: ${resource.contents[0].text}`);
  }

  // 6. 断开连接
  await client.close();
  console.log("👋 已断开连接");
}

main().catch(console.error);
