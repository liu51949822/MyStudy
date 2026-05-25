/**
 * API 中间件 — 请求级别的前置处理
 *
 * 当前功能：
 * - Rate Limiting（请求限流）
 *
 * Next.js 中间件会在每个 API 请求前执行，
 * 相当于给所有 API 加了一道"安检门"。
 */
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

export function middleware(request: NextRequest) {
  // 只对 API 路由生效
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return;
  }

  // 用 IP 作为限流 key
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const result = checkRateLimit(ip, 30, 60 * 1000);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "请求过于频繁，请稍后再试",
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 添加限流头信息
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
