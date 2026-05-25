# rag_2: 文档处理 RAG — 实现计划

## 任务概述
在 `rag_2` 分支上（基于 rag-tutorial 创建），新增文件上传和文本分块功能。

## 分支操作
```bash
cd /Users/apple/Documents/MyStudy
git checkout rag_2   # 已在此分支上
```

## 需要创建/修改的文件

### 1. 新建: `rag-tutorial/lib/chunker.ts`
文本分块器，提供三种分块策略。

**接口**:
```typescript
export type ChunkStrategy = "fixed" | "paragraph" | "recursive";

export interface Chunk {
  content: string;
  index: number;
  metadata: {
    strategy: ChunkStrategy;
    totalChunks: number;
  };
}

export function chunkText(text: string, strategy?: ChunkStrategy): Chunk[]
```

**三种策略实现**:
1. `fixed` — 固定 500 字分块，重叠 50 字
2. `paragraph` — 按空行(\n\n)分块，超过 1000 字再按 fixed 切
3. `recursive` — 递归分块：\n\n → \n → 标点 → fixed（最智能，做默认值）

**函数签名**:
```typescript
function chunkByFixedSize(text: string, chunkSize?: number, overlap?: number): Chunk[]
function chunkByParagraph(text: string, maxChunkSize?: number): Chunk[]
function chunkByRecursive(text: string, maxChunkSize?: number): Chunk[]
```

### 2. 新建: `rag-tutorial/app/api/upload/route.ts`
文件上传 API 端点。

**端点**: `POST /api/upload`
**格式**: `multipart/form-data`，字段名 `file`
**支持格式**: .txt, .md（直接 text()），其他返回 400 错误
**流程**: 读取文件 → `ingest(content)` → 返回结果

**代码结构**:
```typescript
import { NextRequest, NextResponse } from "next/server";

async function extractTextFromFile(file: File): Promise<string> {
  // .txt/.md → file.text()
  // 其他 → throw Error
}

export async function POST(request: NextRequest) {
  // 1. formData.get("file")
  // 2. 验证 file instanceof File, file.size > 0
  // 3. extractTextFromFile(file)
  // 4. const { ingest } = await import("@/lib/rag")  // 动态 import 避免构建报错
  // 5. const message = await ingest(content)
  // 6. return { message, filename }
}
```

### 3. 修改: `rag-tutorial/lib/rag.ts`
修改 `ingest()` 函数，改为接收文本后先分块，逐块存入。

**变更**:
```typescript
import { chunkText, type ChunkStrategy } from "./chunker";

// 可选参数 strategy
export async function ingest(
  content: string,
  strategy?: ChunkStrategy
): Promise<string> {
  // 1. 分块
  const chunks = chunkText(content, strategy);
  
  // 2. 逐块生成向量并存入
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk.content);
    await insertDocument(chunk.content, embedding);
  }
  
  return `✅ 已成功存入 ${chunks.length} 个文本块！`;
}
```

### 4. 修改: `rag-tutorial/app/page.tsx`
在 UI 中增加文件上传区域。

**新增 UI 元素**:
- 文件拖拽区域 (用 input type="file" + drag events)
- 上传状态显示
- 分块结果信息（存入了多少个块）

**新增 handler**:
```typescript
async function handleUpload(e: FormEvent) {
  // 1. 从 input.files 获取文件
  // 2. new FormData() + formData.append("file", file)
  // 3. fetch POST /api/upload
  // 4. 显示结果
}
```

不需要额外依赖，纯浏览器 File API。

### 5. 修改: `rag-tutorial/docs/`
在 docs/ 目录下新增 2 篇文档。

**docs/07-文本分块详解.md**:
- 为什么需要分块（整本书的问题）
- 三种分块策略的对比
- 块大小选择（500？1000？）
- 重叠(overlap)的作用
- 课后练习：试试不同的策略

**docs/08-文件上传处理.md**:
- multipart/form-data 格式
- 浏览器 File API
- 文件类型验证
- 课后练习：支持 PDF 解析

### 6. 无需修改
- package.json（不需要新增依赖）
- tsconfig.json（不需要修改）
- .env.local（不需要修改）

## 参考资料
- 现有 `rag-tutorial/lib/rag.ts` — 理解 ingest/query 流程
- 现有 `rag-tutorial/app/page.tsx` — 理解 UI 结构
- 现有 `docs/` — 保持一致的文档风格

## 验证
```bash
cd /Users/apple/Documents/MyStudy/rag-tutorial
npm run build  # 必须无错误通过
```
