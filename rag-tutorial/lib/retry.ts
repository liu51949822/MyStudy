/**
 * ============================================
 * 自动重试 — lib/retry.ts
 * ============================================
 *
 * 为什么需要重试？
 * - OpenAI API 偶尔会超时或返回 429（限流）
 * - 数据库连接可能暂时断开
 * - 网络可能不稳定
 *
 * 重试策略：指数退避（Exponential Backoff）
 *   第 1 次失败：等 1 秒
 *   第 2 次失败：等 2 秒
 *   第 3 次失败：等 4 秒
 *   第 4 次失败：等 8 秒
 *   ...
 */

/**
 * 带指数退避的重试包装器
 *
 * @param fn - 要重试的异步函数
 * @param maxRetries - 最大重试次数（默认 3）
 * @param baseDelayMs - 基础延迟（默认 1000ms）
 * @returns 函数执行结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // 指数退避：2^attempt * baseDelay
        const delay = Math.min(
          Math.pow(2, attempt) * baseDelayMs,
          30000 // 最大 30 秒
        );
        console.log(
          `🔄 第 ${attempt + 1} 次失败，${delay}ms 后重试: ${lastError.message}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("重试失败");
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: any): boolean {
  const msg = String(error?.message || error).toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset")
  );
}
