# 第 4 课：RAG 工作流详解

## 知识入库流程
1. 文本 → DeepSeek embedding API → 向量
2. 文本 + 向量 → PostgreSQL

## 知识问答流程
1. 问题 → DeepSeek embedding API → 向量
2. 向量搜索 → 找最相似的 K 条
3. 拼接参考资料
4. AI 基于资料回答问题
