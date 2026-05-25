/**
 * ============================================
 * 文本分块器 — lib/chunker.ts
 * ============================================
 *
 * 为什么要分块？
 * --------------------------------------------
 * 1. 嵌入模型有输入长度限制（text-embedding-3-small 最大 8191 tokens）
 * 2. 小块文本的向量更"集中"，检索精度更高
 * 3. 可以更精细地定位答案来源（粒度更小）
 *
 * 本模块提供三种分块策略，适用于不同场景：
 * - fixed:     固定字数分块，简单直接
 * - paragraph: 按自然段落分块，保持语义完整
 * - recursive: 递归分块，自动选择最合适的分隔符
 */

/** 分块策略类型 */
export type ChunkStrategy = "fixed" | "paragraph" | "recursive";

/** 单个文本块 */
export interface Chunk {
  /** 文本块内容 */
  content: string;
  /** 块编号（从 0 开始） */
  index: number;
  /** 元数据 */
  metadata: {
    /** 使用的分块策略 */
    strategy: ChunkStrategy;
    /** 总块数 */
    totalChunks: number;
  };
}

/**
 * 固定字数分块
 *
 * 最简单的分块方式：每隔 N 个字切一刀。
 * 相邻块之间有重叠，避免关键的句子刚好被切开。
 *
 * @param text      原始文本
 * @param chunkSize 每块的字数（默认 500）
 * @param overlap   相邻块的重叠字数（默认 50）
 *
 * 示意图：
 *   [===== 块 0 =====]
 *             [===== 块 1 =====]
 *                       [===== 块 2 =====]
 *   ~~~~~~ = overlap 区域（前后块共享的部分）
 */
function chunkByFixedSize(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const chunks: string[] = [];
  const cleanText = text.trim();
  if (!cleanText) return chunks;

  const step = chunkSize - overlap;
  if (step <= 0) {
    // overlap 不能大于等于 chunkSize，否则会死循环
    return [cleanText];
  }

  let start = 0;
  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    chunks.push(cleanText.slice(start, end));
    start += step;
  }

  return chunks;
}

/**
 * 段落分块
 *
 * 按自然段落（空行分隔）来切分文本。
 * 如果某个段落太长（超过 maxChunkSize），
 * 会继续用固定字数方式对该段落再切分。
 *
 * @param text         原始文本
 * @param maxChunkSize 段落最大字数（默认 1000）
 */
function chunkByParagraph(
  text: string,
  maxChunkSize: number = 1000
): string[] {
  const cleanText = text.trim();
  if (!cleanText) return [];

  // 按空行（一个或多个连续空行）分割
  const paragraphs = cleanText.split(/\n\s*\n/);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxChunkSize) {
      // 段落长度合适，直接作为一个块
      chunks.push(trimmed);
    } else {
      // 段落太长，用固定字数方式再切分
      const subChunks = chunkByFixedSize(trimmed, maxChunkSize, 50);
      chunks.push(...subChunks);
    }
  }

  return chunks;
}

/**
 * 递归分块
 *
 * 从最大的分隔符开始尝试切分，如果切出来的块还是太大，
 * 就对那个块用更小的分隔符递归切分，直到所有块都在限制内。
 *
 * 分隔符优先级（从大到小）：
 *   1. 空行（\n\n）          — 段落边界，语义最完整
 *   2. 换行（\n）            — 句子边界
 *   3. 句尾标点（。！？）     — 完整句子
 *   4. 句中标点（，；、）     — 子句/短语
 *   5. 固定字数              — 兜底方案
 *
 * @param text         原始文本
 * @param maxChunkSize 每块最大字数（默认 500）
 */
function chunkByRecursive(
  text: string,
  maxChunkSize: number = 500
): string[] {
  const cleanText = text.trim();
  if (!cleanText) return [];

  // 分隔符列表：从大到小
  // 正则中 () 表示捕获组，split 会把分隔符保留在结果中
  const separators: RegExp[] = [
    /\n\s*\n/,                    // 空行（段落间）
    /\n/,                          // 换行
    /(?<=[。！？])/,              // 在句号、感叹号、问号之后切分
    /(?<=[，；、])/,              // 在逗号、分号、顿号之后切分
  ];

  return recursiveSplit(cleanText, separators, maxChunkSize);
}

/**
 * 递归拆分的核心逻辑
 *
 * @param text         待拆分的文本
 * @param separators   剩余可用的分隔符列表
 * @param maxChunkSize 每块最大字数
 */
function recursiveSplit(
  text: string,
  separators: RegExp[],
  maxChunkSize: number
): string[] {
  // 如果当前文本长度已在限制内，直接返回
  if (text.length <= maxChunkSize) {
    return [text];
  }

  // 如果还有分隔符可用，尝试用下一个分隔符拆分
  if (separators.length > 0) {
    const [currentSep, ...remainingSeps] = separators;
    const parts = text.split(currentSep).map((s) => s.trim()).filter(Boolean);

    // 如果能成功拆分成多段（> 1），说明这个分隔符有效
    if (parts.length > 1) {
      const results: string[] = [];
      for (const part of parts) {
        // 对每一段递归处理
        results.push(...recursiveSplit(part, remainingSeps, maxChunkSize));
      }
      return results;
    }

    // 当前分隔符无法拆分（只分出一段），用剩余分隔符继续尝试
    return recursiveSplit(text, remainingSeps, maxChunkSize);
  }

  // 所有分隔符都用完了，文本还是太长，用固定字数兜底
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += maxChunkSize;
  }
  return chunks;
}

/**
 * 文本分块主函数
 *
 * 根据指定的策略对文本进行分块，返回统一格式的 Chunk 数组。
 *
 * @param text     要分块的原始文本
 * @param strategy 分块策略（默认 "recursive"）
 * @returns 分块结果数组
 *
 * 使用示例：
 *   const chunks = chunkText("这是一段很长的文本...", "paragraph");
 *   // chunks[0] = { content: "第一段", index: 0, metadata: { ... } }
 */
export function chunkText(
  text: string,
  strategy: ChunkStrategy = "recursive"
): Chunk[] {
  let rawChunks: string[];

  switch (strategy) {
    case "fixed":
      rawChunks = chunkByFixedSize(text);
      break;
    case "paragraph":
      rawChunks = chunkByParagraph(text);
      break;
    case "recursive":
      rawChunks = chunkByRecursive(text);
      break;
    default:
      rawChunks = chunkByRecursive(text);
  }

  // 将原始字符串数组包装成 Chunk 格式
  const totalChunks = rawChunks.length;
  return rawChunks
    .filter((c) => c.trim().length > 0)
    .map((content, index) => ({
      content,
      index,
      metadata: {
        strategy,
        totalChunks,
      },
    }));
}
