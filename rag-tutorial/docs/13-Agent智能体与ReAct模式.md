# 📖 第 13 课：Agent 智能体与 ReAct 模式

## 13.1 什么是 Agent？

**Agent = AI 智能体 = 能自主行动的 AI**

```
普通 AI：用户问 → AI 答（被动）
Agent：用户给目标 → AI 自己想办法完成（主动）
```

### 现实类比

```
普通 AI 像"自动售货机"：
  投币 → 选择 → 出货

Agent 像"人类助手"：
  "帮我查一下RAG和传统搜索的区别"
  → 先搜索"RAG"
  → 再搜索"传统搜索"
  → 对比分析
  → 给出结论
```

## 13.2 ReAct 模式

ReAct = Reasoning + Acting

```
循环：
  Thought（思考）→ "我需要查一下RAG的定义"
  Action（行动）→ rag_search(query="RAG")
  Observation（观察）→ "RAG是检索增强生成..."
  
  Thought（思考）→ "再看看传统搜索"
  Action（行动）→ rag_search(query="传统搜索引擎")
  Observation（观察）→ "传统搜索基于关键词匹配..."
  
  Thought（思考）→ "现在信息够了，对比一下"
  Final Answer → "RAG和传统搜索的主要区别是..."
```

## 13.3 代码实现

```typescript
for (let step = 0; step < maxSteps; step++) {
  // AI 思考并决定下一步
  const response = await ai.think(messages);
  
  // 如果是 Final Answer，结束
  if (response.includes("Final Answer:")) return extractAnswer(response);
  
  // 否则解析 Action，执行工具
  const { tool, args } = parseAction(response);
  const result = await executeTool(tool, args);
  
  // 把结果给 AI 继续思考
  messages.push(`Observation: ${result}`);
}
```

## 13.4 Agent vs 普通 RAG

| 特性 | 普通 RAG | ReAct Agent |
|------|---------|-------------|
| 搜索次数 | 1 次 | 多次（自主决定） |
| 工具使用 | 固定流程 | 自主选择 |
| 推理能力 | 无 | 有（思考链） |
| 复杂度 | 低 | 高 |
| 适用场景 | 简单问答 | 复杂研究任务 |

## 13.5 课后练习

1. **增加工具**：添加 `web_search` 工具，让 Agent 可以联网
2. **长期记忆**：让 Agent 记住之前的研究结果
3. **多 Agent 协作**：一个 Agent 负责搜索，一个负责总结
4. **步数限制**：改成按 token 限制而不是步数限制
