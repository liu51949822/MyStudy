/**
 * ============================================
 * LRU 缓存 — lib/cache.ts
 * ============================================
 *
 * 为什么需要缓存？
 *
 * RAG 流程中最慢的操作是调用 OpenAI API 生成向量。
 * 如果两个用户问"什么是 RAG？"，系统会生成两次完全相同的向量，
 * 浪费时间和金钱。
 *
 * 缓存的工作原理：
 *   请求 → 缓存里有？ → 有：直接返回缓存结果
 *                    → 没有：调用 API → 存缓存 → 返回
 *
 * LRU = Least Recently Used（最近最少使用）
 * 缓存满了以后，删除最久没用过的条目。
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * 简单的 LRU 缓存实现
 *
 * 用 Map 存储，利用 Map 的插入顺序特性实现 LRU。
 * 每次访问一个条目时，先删再插（提到最后），
 * 这样最久没用的条目就在 Map 的开头。
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttlMs: number; // 过期时间（毫秒）

  constructor(maxSize: number = 100, ttlMs: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs; // 默认 5 分钟
  }

  /**
   * 获取缓存
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // LRU：先删再插，提到最后
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T): void {
    // 如果已满，删除最早的一个
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 当前缓存大小
   */
  get size(): number {
    return this.cache.size;
  }
}

// 全局缓存实例
export const embeddingCache = new LRUCache<number[]>(100, 10 * 60 * 1000);
export const searchCache = new LRUCache<any[]>(50, 60 * 1000);
