/**
 * ============================================
 * 聊天历史管理 — lib/chat-history.ts
 * ============================================
 *
 * 多轮对话的核心：记住"刚才说了什么"。
 *
 * 如果没有历史管理：
 *   用户：什么是 RAG？
 *   AI：RAG 是检索增强生成...
 *   用户：它有什么优点？      ← AI 不知道"它"指什么
 *   AI：它有什么优点...嗯？你在说什么？
 *
 * 有了历史管理：
 *   用户：什么是 RAG？
 *   历史：[用户说"什么是 RAG？"，AI 说"RAG 是..."]
 *   用户：它有什么优点？
 *   历史：[用户说"什么是 RAG？"，AI 说"RAG 是..."]
 *   AI 看历史 → 知道"它"= RAG → 正确回答
 *
 * 为什么用内存 Map 而不是数据库？
 * - 简单，零配置，零依赖
 * - 适合教学和原型
 * - 生产环境应该用 Redis / 数据库持久化
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
}

/**
 * 内存会话存储
 *
 * Map 的 key = sessionId, value = ChatSession
 * 服务器重启后数据丢失（教学阶段可以接受）
 */
const sessions = new Map<string, ChatSession>();

/**
 * 创建新会话
 * @returns 唯一的会话 ID
 */
export function createSession(): string {
  const id = crypto.randomUUID();
  sessions.set(id, {
    id,
    messages: [],
    createdAt: Date.now(),
  });
  return id;
}

/**
 * 获取会话
 * @param sessionId - 会话 ID
 * @returns ChatSession 或 null（不存在时）
 */
export function getSession(sessionId: string): ChatSession | null {
  return sessions.get(sessionId) ?? null;
}

/**
 * 添加消息到会话历史
 *
 * @param sessionId - 会话 ID
 * @param role - 角色（user=用户, assistant=AI）
 * @param content - 消息内容
 */
export function addMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): void {
  const session = sessions.get(sessionId);
  if (!session) {
    console.warn(`会话 ${sessionId} 不存在`);
    return;
  }
  session.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });
}

/**
 * 获取最近的 N 条消息
 *
 * 为什么只要最近的？
 * - GPT 有上下文窗口限制（Token 配额）
 * - 太早的对话对当前问题帮助不大
 * - 省钱（Token = 钱）
 *
 * @param sessionId - 会话 ID
 * @param limit - 最多返回几条（默认 6 = 3 轮对话）
 * @returns 最近的消息数组
 */
export function getRecentMessages(
  sessionId: string,
  limit: number = 6
): ChatMessage[] {
  const session = sessions.get(sessionId);
  if (!session) return [];
  return session.messages.slice(-limit);
}

/**
 * 修剪历史：保留最近的 N 条，删除更早的
 *
 * 防止内存泄漏：如果用户聊了 1000 轮，不能全记住。
 *
 * @param sessionId - 会话 ID
 * @param maxMessages - 最多保留多少条（默认 20）
 */
export function trimHistory(
  sessionId: string,
  maxMessages: number = 20
): void {
  const session = sessions.get(sessionId);
  if (!session || session.messages.length <= maxMessages) return;
  session.messages = session.messages.slice(-maxMessages);
}
