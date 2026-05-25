/**
 * ============================================
 * 请求限流器 — lib/rate-limiter.ts
 * ============================================
 *
 * 为什么需要限流？
 * - DeepSeek API 有调用频率限制
 * - 免费用户可能被恶意刷接口
 * - 保护后端不被过载
 *
 * 实现方式：滑动窗口 + 令牌桶
 * 每个 IP 每分钟最多 N 次请求。
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateLimitEntry>();

/**
 * 检查是否超过限流
 *
 * @param key - 限流键（通常是 IP 或用户 ID）
 * @param maxRequests - 窗口内最大请求数
 * @param windowMs - 时间窗口（毫秒）
 * @returns 是否允许通过
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = limits.get(key);

  // 如果没有记录或已过期，创建新的
  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  // 检查是否超限
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // 计数 +1
  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * 定期清理过期条目（每 5 分钟）
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limits.entries()) {
    if (now > entry.resetAt) {
      limits.delete(key);
    }
  }
}, 5 * 60 * 1000);
