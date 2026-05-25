import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDB(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    await client.query(\`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        embedding vector(1536)
      )
    \`);
    console.log("数据库初始化成功");
  } finally {
    client.release();
  }
}

export async function insertDocument(content: string, embedding: number[]): Promise<void> {
  await pool.query("INSERT INTO documents (content, embedding) VALUES ($1, $2::vector)", [content, embedding]);
}

export async function searchSimilarDocuments(
  embedding: number[], limit: number = 3
): Promise<{ id: number; content: string; distance: number }[]> {
  const result = await pool.query(
    "SELECT id, content, embedding <=> $1::vector AS distance FROM documents ORDER BY distance ASC LIMIT $2",
    [embedding, limit]
  );
  return result.rows;
}

export { pool };
