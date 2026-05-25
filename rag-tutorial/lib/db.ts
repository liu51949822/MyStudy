/**
 * ============================================
 * 数据库连接层 — lib/db.ts
 * ============================================
 *
 * 这个文件负责：
 * 1. 连接 PostgreSQL 数据库
 * 2. 创建 documents 表（自动建表）
 * 3. 执行 SQL 查询
 *
 * 关键技术点：
 * - pgvector 扩展：让 PostgreSQL 支持向量存储和相似度搜索
 * - 连接池：复用数据库连接，提高性能
 * - 单例模式：全局只维护一个连接池
 * - 全文搜索：使用 tsvector + GIN 索引实现关键词搜索
 */

import { Pool } from "pg";

/**
 * 创建数据库连接池
 *
 * Pool 是 PostgreSQL 的连接池管理工具。
 * 连接池会预先创建一组数据库连接，需要时直接取用，
 * 用完归还，避免反复创建/销毁连接的开销。
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * 初始化数据库 — 创建必要的表和扩展
 *
 * 这个函数应该在应用启动时调用一次。
 * 它会：
 * 1. 启用 pgvector 扩展（让 PG 支持向量运算）
 * 2. 创建 documents 表（存储文本和对应的向量）
 * 3. 创建全文搜索索引（关键词搜索）
 *
 * pgvector 是 PostgreSQL 的向量插件，
 * 它让我们可以在 SQL 里直接算向量的余弦相似度。
 */
export async function initDB(): Promise<void> {
  const client = await pool.connect();
  try {
    // 启用 pgvector 扩展
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // 创建 documents 表（如果不存在的话）
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(1536)
      )
    `);

    // 添加全文搜索列（如果不存在）
    // tsvector 是 PostgreSQL 的全文搜索数据类型
    // 它把文本预处理成"词向量"，方便快速关键词匹配
    await client.query(`
      ALTER TABLE documents
      ADD COLUMN IF NOT EXISTS content_tsv tsvector
      GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED
    `);

    // 创建 GIN 索引加速全文搜索
    // GIN (Generalized Inverted Index) 是 PostgreSQL 的倒排索引
    // 倒排索引：记录"每个词出现在哪些文档中"
    // 和"正排索引"（记录"每个文档包含哪些词"）相反
    // 倒排索引让关键词搜索从 O(n) 变成 O(1)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_fts
      ON documents
      USING GIN(content_tsv)
    `);

    console.log("✅ 数据库初始化成功（含全文搜索索引）");
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 插入文档（文本 + 向量）到数据库
 *
 * content_tsv 列是 GENERATED ALWAYS 的，
 * 会自动根据 content 生成，不需要手动插入。
 */
export async function insertDocument(
  content: string,
  embedding: number[]
): Promise<void> {
  await pool.query(
    `INSERT INTO documents (content, embedding) VALUES ($1, $2::vector)`,
    [content, embedding]
  );
}

/**
 * 纯向量相似度搜索
 *
 * 用余弦距离找到与目标向量最相似的 K 条记录。
 * 适合"语义匹配"（意思相近的文本）。
 */
export async function searchSimilarDocuments(
  embedding: number[],
  limit: number = 3
): Promise<{ id: number; content: string; distance: number }[]> {
  const result = await pool.query(
    `
    SELECT id, content, embedding <=> $1::vector AS distance
    FROM documents
    ORDER BY distance ASC
    LIMIT $2
    `,
    [embedding, limit]
  );

  return result.rows;
}

/**
 * 混合搜索 —— 向量搜索 + 关键词搜索
 *
 * 为什么需要混合搜索？
 * 纯向量搜索擅长"语义匹配"：
 *   "请假流程" → "年假审批"（意思相近，但关键词不同）
 *
 * 纯关键词搜索擅长"精确匹配"：
 *   "工号 10086" → "工号 10086"（精确匹配）
 *
 * 混合搜索两者结合，效果更好。
 *
 * 使用 RRF (Reciprocal Rank Fusion) 算法合并结果：
 *   1. 向量搜索取前 10 条
 *   2. 关键词搜索取前 10 条
 *   3. 对每条结果计算 RRF 分数：1 / (60 + rank)
 *   4. 按总分排序，取前 K 条
 *
 * @param embedding - 问题的向量
 * @param queryText - 问题的原文（用于关键词搜索）
 * @param topK - 最终返回的结果数
 * @returns 合并后的结果
 */
export async function hybridSearch(
  embedding: number[],
  queryText: string,
  topK: number = 5
): Promise<{ id: number; content: string; score: number }[]> {
  const result = await pool.query(
    `
    WITH vector_results AS (
      SELECT id, content, embedding <=> $1::vector AS vector_dist
      FROM documents
      ORDER BY vector_dist ASC
      LIMIT 10
    ),
    keyword_results AS (
      SELECT id, content,
        ts_rank(content_tsv, plainto_tsquery('simple', $2)) AS kw_score
      FROM documents
      WHERE content_tsv @@ plainto_tsquery('simple', $2)
      ORDER BY kw_score DESC
      LIMIT 10
    ),
    combined AS (
      -- 向量搜索结果（RRF 分数）
      SELECT id, content,
        1.0 / (60.0 + ROW_NUMBER() OVER (ORDER BY vector_dist ASC)) AS score
      FROM vector_results
      UNION
      -- 关键词搜索结果（RRF 分数）
      SELECT id, content,
        1.0 / (60.0 + ROW_NUMBER() OVER (ORDER BY kw_score DESC)) AS score
      FROM keyword_results
    )
    SELECT id, content, SUM(score) AS score
    FROM combined
    GROUP BY id, content
    ORDER BY score DESC
    LIMIT $3
    `,
    [embedding, queryText, topK]
  );

  return result.rows;
}

export { pool };
