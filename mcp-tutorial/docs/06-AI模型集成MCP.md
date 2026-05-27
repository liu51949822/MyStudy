# 📖 MCP 第 6 课：AI 模型集成 MCP

## 集成流程
1. AI 收到用户问题
2. AI 决定需要调用工具
3. AI 通过 MCP Client 调用工具
4. 工具结果返回给 AI
5. AI 基于结果生成回答

## Function Calling
OpenAI/DeepSeek 的 function calling 让 AI 可以：
- 自主决定调用哪个工具
- 自动解析工具返回的结果
- 根据结果生成自然语言回答

## 运行
```bash
export DEEPSEEK_API_KEY=sk-xxx
npx tsx src/ai-client.ts
```
