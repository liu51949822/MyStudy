# 📖 MCP 第 1 课：MCP 基础概念

## 什么是 MCP？
MCP = Model Context Protocol（模型上下文协议）

### 类比理解
- USB 协议: 设备 ↔ 电脑（硬件）
- HTTP 协议: 浏览器 ↔ 服务器（网络）
- MCP 协议: AI ↔ 工具（AI 应用）

## 核心概念
| 概念 | 说明 | 类比 |
|------|------|------|
| Server | 提供工具的服务器 | USB 设备 |
| Client | 调用工具的 AI 应用 | 电脑 |
| Tool | 可调用的功能 | 设备的功能 |
| Transport | 通信方式 | USB 线缆 |

## 第一个 MCP Server
```typescript
const server = new Server({ name: "my-server", version: "1.0.0" });
const transport = new StdioServerTransport();
await server.connect(transport);
```

## 启动方式
```bash
npm install
npm run dev
```
