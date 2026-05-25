/**
 * ============================================
 * 监控与日志 — lib/telemetry.ts
 * ============================================
 *
 * 生产环境中，我们需要知道：
 * - 每个请求花了多长时间？
 * - DeepSeek API 用了多少 Token？
 * - 搜索质量怎么样？
 *
 * 这个模块记录所有关键指标。
 */

interface TelemetryEntry {
  timestamp: number;
  type: string;
  data: Record<string, any>;
  durationMs: number;
}

const logs: TelemetryEntry[] = [];
const MAX_LOGS = 1000; // 最多保留 1000 条

/**
 * 记录一条遥测数据
 */
export function recordTelemetry(
  type: string,
  data: Record<string, any>,
  durationMs: number
): void {
  const entry: TelemetryEntry = {
    timestamp: Date.now(),
    type,
    data,
    durationMs,
  };

  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.shift(); // 删除最旧的一条
  }

  // 打印到控制台
  const slowMark = durationMs > 5000 ? " ⚠️" : "";
  console.log(
    `📊 [${type}] ${durationMs}ms${slowMark}`,
    JSON.stringify(data).slice(0, 100)
  );
}

/**
 * 获取最近的遥测数据
 */
export function getRecentTelemetry(
  type?: string,
  limit: number = 10
): TelemetryEntry[] {
  let filtered = type ? logs.filter((l) => l.type === type) : logs;
  return filtered.slice(-limit);
}

/**
 * API 请求耗时计时器
 *
 * 使用方式：
 *   const timer = startTimer("query");
 *   // ... 执行操作 ...
 *   timer.end({ result: "success" });
 */
export function startTimer(type: string) {
  const start = Date.now();
  return {
    end: (data: Record<string, any> = {}) => {
      recordTelemetry(type, data, Date.now() - start);
    },
  };
}
