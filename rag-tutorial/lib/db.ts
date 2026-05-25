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
 *
 * pgvector 是 PostgreSQL 的向量插件，
 * 它让我们可以在 SQL 里直接算向量的余弦相似度。
 *
 * documents 表的字段：
 * - id:       自增主键
 * - content:  原始文本内容
 * - embedding: 文本的向量表示（1536 维）
 *              1536 是 OpenAI deepseek-embedding 模型的输出维度
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

    console.log("✅ 数据库初始化成功");
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 插入文档（文本 + 向量）到数据库
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
 * 向量相似度搜索
 *
 * 用余弦距离找到与目标向量最相似的 K 条记录。
 *
 * 什么是向量相似度搜索？
 * 想象一下：我们把"猫"和"狗"这两个词映射到向量空间，
 * 它们会离得很近（都是动物），而和"冰箱"离得很远。
 * 这里我们做的就是找"最接近的邻居"。
 *
 * 用到的 SQL 特性：
 * - <=> 操作符：pgvector 提供的余弦距离运算符
 * - ORDER BY ... LIMIT：取距离最小的 K 条
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

export { pool };
