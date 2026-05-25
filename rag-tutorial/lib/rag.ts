import { getEmbedding, askAIWithContext } from "./embeddings";
import { insertDocument, searchSimilarDocuments, initDB } from "./db";

export async function initRAG(): Promise<void> { await initDB(); }

export async function ingest(content: string): Promise<string> {
  const embedding = await getEmbedding(content);
  await insertDocument(content, embedding);
  return "文本已成功存入知识库！";
}

export async function query(question: string): Promise<{ answer: string; sources: string[] }> {
  const questionEmbedding = await getEmbedding(question);
  const similarDocs = await searchSimilarDocuments(questionEmbedding, 3);
  if (similarDocs.length === 0) return { answer: "知识库中还没有内容，请先存入一些文本。", sources: [] };
  const context = similarDocs.map(doc => doc.content).join("\n---\n");
  const answer = await askAIWithContext(question, context);
  return { answer, sources: similarDocs.map(doc => doc.content) };
}
