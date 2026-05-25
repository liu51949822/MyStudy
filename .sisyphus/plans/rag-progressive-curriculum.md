# 📚 RAG 递进式教学计划 (rag_2 ~ rag_8)

## TL;DR

> **Quick Summary**: 从 rag_1（已完成的简单 RAG）出发，逐步创建 7 个递进分支 rag_2 ~ rag_8，每个分支引入新的技术维度，难度递增。最终覆盖文档处理、对话系统、混合搜索、MCP 协议、Skill/Prompt 工程、Agent 工作流、全栈生产化。
>
> **Deliverables**: 7 个递进式 Git 分支，每个包含完整可运行的项目 + 教学文档
>
> **Estimated Effort**: XL（每个分支预计 1-3 小时编码 + 文档）
> **Parallel Execution**: NO — 完全递进，每个分支依赖前一个
> **Critical Path**: rag_2 → rag_3 → rag_4 → rag_5 → rag_6 → rag_7 → rag_8

---

## Context

### Original Request
在新分支 rag_2 _3 之后继续创建，每个项目增加难度，引入 skill / prompt / MCP / LSP。

### 整体教育理念
每个分支遵循相同的教学结构：
- **项目代码**：完整可运行，每行有教学注释（中文）
- **教学文档**：`docs/` 目录，分课讲解，解释"为什么这么做"
- **知识点递进**：每个分支只引入 1-2 个新概念，不 overload
- **动手练习**：每个分支末尾有课后练习

### 技术栈
- **全栈框架**: Next.js 14 (App Router) + TypeScript
- **数据库**: PostgreSQL + pgvector
- **AI**: DeepSeek API (embeddings + chat)
- **新增工具**: LangChain（rag_4 起）、MCP SDK（rag_5）、自定义 Skill 系统（rag_6）

---

## Work Objectives

### Core Objective
创建一套从入门到进阶的 RAG 教学课程，每个分支是一个独立的学习里程碑。

### Concrete Deliverables
- 7 个完整的分支，每个包含：代码 + API + UI + 教学文档
- 每篇文档包含：概念讲解、代码分析、运行指南、课后练习
- 所有项目可独立运行

### Definition of Done
- [ ] `npm run build` 无错误
- [ ] `docs/` 目录包含完整课程
- [ ] 每个分支基于前一个分支创建
- [ ] 知识点递进合理，无跳跃

### Must Have
- 每个分支都是功能性 RAG 应用（不是 demo）
- 代码包含中文教学注释
- 递进关系清晰，前一个知识点是后一个的基础

### Must NOT Have (Guardrails)
- 不引入非必要的第三方依赖（保持入门友好）
- 不跳跃难度（每个分支只加 1-2 个新概念）
- 不在教学中出现英文注释（学员中文为主）
- 不走"为了复杂而复杂"的路线

---

## 📋 八阶段递进计划

```
难度▲
    │                      rag_8 ─── 全栈生产级 RAG 系统
    │                            (监控/缓存/错误处理/性能优化)
    │                     rag_7 ─── Agentic RAG
    │                      (多步推理/工具编排/self-reflection)
    │               rag_6 ─── Skill/Prompt 工程 RAG
    │                     (动态Prompt/模板引擎/技能系统)
    │           rag_5 ─── MCP 集成 RAG
    │                 (Model Context Protocol/结构化上下文)
    │       rag_4 ─── 混合搜索 RAG
    │            (BM25+向量/重排序/加权评分)
    │    rag_3 ─── 对话式 RAG
    │          (多轮对话/历史管理/上下文感知)
    │ rag_2 ─── 文档处理 RAG
    │    (文件上传/文本分块/多格式支持)
    │ rag_1 ─── 基础 RAG (已完成)
    │    (文本入库/向量搜索/AI问答)
    └──────────────────────────────────────────────→ 时间
```

---

## 🎯 各分支详细设计

---

### Branch: rag_2 — 文档处理 RAG (文件上传 + 文本分块)

**核心新概念**: 文本分块 (Chunking)、文件上传

**教学价值**: 真实场景中知识库的输入不是一段文字，而是文档。学员学会如何把文档切分成合适的块再入库。

**知识点**:
1. 文件上传组件（拖拽/选择）
2. 文本分块策略（固定大小、按段落、按语义）
3. 分块元数据（文件名、块序号、来源）
4. Chunk 大小对检索质量的影响

**技术变更**:
| 文件 | 变更说明 |
|------|---------|
| `lib/chunker.ts` | 新增 — 文本分块器（3 种策略） |
| `lib/rag.ts` | 修改 — ingest 支持多块处理 |
| `app/api/upload/route.ts` | 新增 — 文件上传 API |
| `app/page.tsx` | 修改 — 增加上传区域 |
| `docs/` | 新增 2 节课 |

**新增依赖**: `@ai-sdk/pdf` (PDF 解析)

**分块策略**:
```
固定分块: 每 500 字一块，重叠 50 字
段落分块: 按空行拆分
语义分块: 按句号/问号拆分 (最基础版本)
```

**教学问题**:
- "为什么不能把整本书当做一个块？"
- "块太小会怎样？块太大呢？"
- "分块重叠 (overlap) 有什么用？"

---

### Branch: rag_3 — 对话式 RAG (多轮对话 + 历史管理)

**核心新概念**: 对话历史、上下文窗口

**教学价值**: 从"一问一答"升级到"连续对话"，让 RAG 能理解上下文。

**知识点**:
1. 聊天历史存储（内存中数组 → 数据库）
2. 上下文压缩（历史对话不占太多 token）
3.  Follow-up 问题处理（"上面说的那个方法..." 指代消解）
4. 对话 ID / Session 管理

**技术变更**:
| 文件 | 变更说明 |
|------|---------|
| `lib/chat-history.ts` | 新增 — 对话历史管理 |
| `lib/rag.ts` | 修改 — query 支持历史注入 |
| `app/api/chat/route.ts` | 新增 — 对话 API |
| `app/page.tsx` | 修改 — 聊天界面（消息列表） |
| `docs/` | 新增 2 节课 |

**核心流程**:
```
用户: "什么是 RAG？" 
  → 检索 + AI回答 "RAG 是..."
  
用户: "它有什么优点？" (Follow-up)
  → 检查历史: 上一条在讨论 RAG
  → 检索 + AI回答 (带上历史)
  → "RAG 的优点包括..."
```

---

### Branch: rag_4 — 混合搜索 RAG (BM25 + 向量 + 重排序)

**核心新概念**: 混合检索、倒排索引、重排序、融合策略

**教学价值**: 纯向量搜索不是万能的。学员学会"关键词搜索 + 向量搜索"结合，理解为什么需要重排序。

**知识点**:
1. BM25 算法（传统关键词搜索）
2. 混合搜索策略（加权合并、RRF 合并）
3. 重排序 (Reranking) — 用交叉模型二次排序
4. 搜索质量评估（精准率/召回率概念）

**技术变更**:
| 文件 | 变更说明 |
|------|---------|
| `lib/hybrid-search.ts` | 新增 — BM25 实现 + 混合搜索 |
| `lib/reranker.ts` | 新增 — 重排序逻辑 |
| `lib/db.ts` | 修改 — 增加全文索引 |
| `app/api/query/route.ts` | 修改 — 支持搜索策略参数 |
| `docs/` | 新增 2 节课 |

**SQL 变更**:
```sql
-- 增加全文搜索索引
ALTER TABLE documents ADD COLUMN content_tsv tsvector;
CREATE INDEX idx_content_tsv ON documents USING GIN(content_tsv);

-- 混合搜索
SELECT content FROM (
  -- 向量搜索部分
  SELECT content, 1/(1+embedding <=> $1::vector) AS score
  FROM documents
  LIMIT 20
  
  UNION
  
  -- 关键词搜索部分
  SELECT content, ts_rank(content_tsv, plainto_tsquery('chinese', $2)) AS score
  FROM documents
  WHERE content_tsv @@ plainto_tsquery('chinese', $2)
  LIMIT 20
) AS combined
ORDER BY score DESC LIMIT 5;
```

---

### Branch: rag_5 — MCP 集成 RAG (Model Context Protocol)

**核心新概念**: MCP (Model Context Protocol)、工具调用、结构化上下文

**教学价值**: 理解 MCP 协议如何让 AI 通过标准化接口获取外部数据。这是当前 AI 工程的热门方向。

**知识点**:
1. MCP 协议基础（什么是 MCP、为什么需要）
2. 实现 MCP Server（让知识库成为一个 MCP 工具）
3. 工具调用格式（function calling）
4. 结构化 Context 传递（不仅仅是文本拼接）

**技术变更**:
| 文件 | 变更说明 |
|------|---------|
| `mcp/rag-server.ts` | 新增 — RAG MCP Server |
| `mcp/README.md` | 新增 — MCP 协议说明 |
| `lib/rag-mcp.ts` | 新增 — MCP 格式的 RAG 调用 |
| `lib/tools.ts` | 新增 — 工具定义（search, retrieve, summarize） |
| `lib/embeddings.ts` | 修改 — 支持 tool-use 格式 |
| `app/api/mcp/route.ts` | 新增 — MCP 端点 |
| `docs/` | 新增 2 节课 |

**MCP 消息流**:
```
用户: "RAG 有什么优点？"
  → 系统判断需要查询知识库
  → 调用 mcp_tool: rag_search(query="RAG 优点")
  → MCP Server 执行向量搜索
  → 返回结构化结果 {results: [...], metadata: {...}}
  → AI 基于结构化 Context 回答
```

**关键代码概念**:
```typescript
// MCP 工具定义
const RAG_SEARCH_TOOL = {
  name: "rag_search",
  description: "在知识库中搜索相关文档",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      top_k: { type: "number", default: 3 }
    }
  }
};
```

---

### Branch: rag_6 — Skill/Prompt 工程 RAG (动态 Prompt + 模板引擎)

**核心新概念**: Skill 模块化、Prompt 模板化、few-shot 学习

**教学价值**: 学员学会设计可复用的 Skills（技能模块）和动态 Prompt，这是 AI 应用工程化的核心能力。

**知识点**:
1. Skill 系统设计（注册、选择、组合）
2. Prompt 模板引擎（变量注入、条件分支）
3. Few-shot 示例自动选择（根据相似度选最佳示例）
4. Chain-of-Thought (CoT) 提示
5. 输出格式化（JSON、Markdown、表格）

**技术变更**:
| 文件 | 变更说明 |
|------|---------|
| `lib/skills/summarize.ts` | 新增 — 总结技能 |
| `lib/skills/translate.ts` | 新增 — 翻译技能 |
| `lib/skills/analyze.ts` | 新增 — 分析技能 |
| `lib/skills/registry.ts` | 新增 — 技能注册中心 |
| `lib/prompt-engine.ts` | 新增 — Prompt 模板引擎 |
| `lib/few-shot.ts` | 新增 — 少样本示例管理 |
| `prompts/templates/` | 新增 — Prompt 模板文件 |
| `app/page.tsx` | 修改 — 技能选择 UI |
| `docs/` | 新增 3 节课 |

**Skill 系统设计**:
```typescript
// 每个 Skill 是一个独立模块
interface Skill {
  id: string;
  name: string;
  description: string;
  execute(input: SkillInput): Promise<SkillOutput>;
}

// 技能注册中心
const skills = new Map<string, Skill>();
skills.set("summarize", new SummarizeSkill());
skills.set("translate", new TranslateSkill());
skills.set("qa", new QASkill());   // 默认 RAG 问答
```

**Prompt 模板示例**:
```handlebars
{{! summarize.prompt.md }}
你是一个{{style}}风格的总结助手。
请用{{language}}总结以下内容，控制在{{max_words}}字以内。

内容：
{{content}}

要求：
- 抓住核心要点
- 使用{{tone}}语气
- {{#if include_examples}}包含具体例子{{/if}}
```

---

### Branch: rag_7 — Agentic RAG (多步推理 + 工具编排)

**核心新概念**: AI Agent、ReAct 模式、工具调用链、self-reflection

**教学价值**: 从"被动问答"升级到"主动推理"。Agent 可以决定什么时候查知识库、什么时候问用户、什么时候做计算。

**知识点**:
1. ReAct 模式 (Reasoning + Acting)
2. 多步推理链（Plan → Execute → Observe → Repeat）
3. 工具编排（search, calculate, translate, summarize）
4. Self-reflection（自我纠错，回答前验证）
5. Agent 状态管理

**技术变更**:
| 文件 | 变更说明 |
|------|---------|
| `lib/agent/react.ts` | 新增 — ReAct 循环引擎 |
| `lib/agent/tools.ts` | 新增 — 工具注册（继承 rag_5） |
| `lib/agent/memory.ts` | 新增 — Agent 短期记忆 |
| `lib/agent/planner.ts` | 新增 — 任务规划器 |
| `app/api/agent/route.ts` | 新增 — Agent 对话 API |
| `app/page.tsx` | 修改 — Agent 模式切换 |
| `docs/` | 新增 3 节课 |

**Agent 工作流示例**:
```
用户: "帮我研究一下 RAG 最近的进展"

Agent 思考:
  1. 这个问题需要多步搜索
  2. 先搜"RAG 2024 2025 进展"
  3. 如果结果不够，再搜"RAG 最新论文"
  4. 最后写一个总结报告

Agent 执行:
  Step 1: search("RAG 2024 进展") → 结果 A, B, C
  Step 2: 分析结果发现提到了"GraphRAG"
  Step 3: search("GraphRAG 是什么") → 结果 D, E
  Step 4: summarize([A, B, C, D, E]) → 综合报告
  
Agent 回答:
  "根据搜索到的资料，RAG 近期的进展包括..."
  [附上引用来源]
```

---

### Branch: rag_8 — 全栈生产级 RAG (监控/缓存/性能优化)

**核心新概念**: 生产化、缓存策略、监控、错误恢复

**教学价值**: 从原型到生产。学员学会让 RAG 应用真正可上线：更快、更稳、可观察。

**知识点**:
1. 向量缓存（Redis / 内存 LRU 缓存）
2. 请求限流（Rate Limiting）
3. 日志与监控（请求耗时、Token 使用量、搜索质量）
4. 错误恢复（自动重试、降级策略）
5. 性能基准测试
6. 数据库连接优化（连接池调优、索引优化）

**技术变更**:
| 文件 | 变更说明 |
|------|---------|
| `lib/cache.ts` | 新增 — LRU 缓存 + Redis 适配器 |
| `lib/rate-limiter.ts` | 新增 — 请求限流 |
| `lib/telemetry.ts` | 新增 — 监控与日志 |
| `lib/retry.ts` | 新增 — 自动重试+降级 |
| `app/api/middleware.ts` | 新增 — API 中间件 |
| `scripts/benchmark.ts` | 新增 — 性能基准 |
| `docs/` | 新增 2 节课 |

**架构图**:
```
用户请求
  → Rate Limiter (限流)
    → Cache Hit? (缓存命中)
      → YES: 返回缓存结果
      → NO: 继续流程
        → Retry wrapper (自动重试)
          → Vector Search (向量搜索)
          → AI Generation (AI 生成)
          → Cache Store (写缓存)
        → Telemetry (记录耗时/Token)
    → Response (返回)
```

---

## 各分支难度评估

| 分支 | 难度 | 新概念数 | 代码量估算 | 前置知识 |
|------|------|---------|-----------|---------|
| rag_2 | ★★☆☆☆ | 2 | +200 行 | JavaScript 基础 |
| rag_3 | ★★☆☆☆ | 2 | +250 行 | rag_2 |
| rag_4 | ★★★☆☆ | 3 | +350 行 | rag_2-3 |
| rag_5 | ★★★★☆ | 2 | +300 行 | rag_4 |
| rag_6 | ★★★☆☆ | 3 | +400 行 | rag_5 |
| rag_7 | ★★★★★ | 3 | +500 行 | rag_5-6 |
| rag_8 | ★★★★☆ | 4 | +350 行 | rag_7 |

---

## 教学文档概览 (每个分支 5-8 节课)

| 分支 | 课程数 | 代表性课程 |
|------|--------|-----------|
| rag_2 | 5 | 文本分块的艺术、文件上传处理 |
| rag_3 | 5 | 对话历史管理、Follow-up 问题处理 |
| rag_4 | 6 | BM25 原理、混合搜索策略、重排序入门 |
| rag_5 | 5 | MCP 协议入门、构建你的第一个 MCP Server |
| rag_6 | 7 | Skill 系统设计、Prompt 模板引擎、Few-shot 选择 |
| rag_7 | 6 | ReAct 模式详解、多步推理链 |
| rag_8 | 5 | 缓存策略、监控与可观测性 |

---

## 执行策略

### 执行顺序
必须从 rag_2 → rag_8 顺序执行，每个分支建立在前一个之上。

### 每分支执行步骤
1. 从上一分支创建新分支
2. 拷贝其 rag-tutorial/ 目录作为起点
3. 增量修改/新增文件
4. 写教学文档
5. npm run build 验证
6. Git commit

### 批处理建议
鉴于 7 个分支的工作量较大，建议分 2-3 轮执行：
- **第 1 轮**: rag_2 + rag_3 + rag_4（基础 → 对话 → 混合搜索）
- **第 2 轮**: rag_5 + rag_6（MCP + Skill/Prompt）
- **第 3 轮**: rag_7 + rag_8（Agent + 生产化）

---

## 关键里程碑

| 里程碑 | 内容 | 预计耗时 |
|--------|------|---------|
| rag_2 完成 | 支持文件上传 + 分块 | 1-2 小时 |
| rag_3 完成 | 支持多轮对话 | 1-2 小时 |
| rag_4 完成 | 支持混合搜索 + 重排序 | 2-3 小时 |
| rag_5 完成 | MCP 集成 | 2-3 小时 |
| rag_6 完成 | Skill/Prompt 系统 | 2-3 小时 |
| rag_7 完成 | Agent 工作流 | 3-4 小时 |
| rag_8 完成 | 全栈生产化 | 2-3 小时 |
| **全部完成** | **7 个分支 + 全部文档** | **~15-20 小时** |

---

## Success Criteria

### 验证命令
```bash
cd rag-tutorial
npm run build  # 每个分支必须无错误通过
```

### Final Checklist
- [ ] rag_2: 文件上传 + 分块入库工作正常
- [ ] rag_3: 多轮对话保持上下文
- [ ] rag_4: 混合搜索比纯向量搜索质量更好
- [ ] rag_5: MCP 工具可被外部调用
- [ ] rag_6: 多个 Skill 可切换使用
- [ ] rag_7: Agent 能自主完成多步推理
- [ ] rag_8: 有缓存/监控/限流机制
- [ ] 所有分支 docs/ 目录文档完整
- [ ] 所有分支 npm run build 通过
