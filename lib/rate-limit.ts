import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { query } from "./db";
import { sessionSecretKey } from "./session";

export type RateLimitRule = { scope: string; key: string; limit: number; windowSeconds: number };

export function requestClientKey(request: Request) {
  // Vercel overwrites x-vercel-forwarded-for. Never trust user-controlled x-forwarded-for.
  return process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "local";
}

export async function enforceRateLimit(rule: RateLimitRule) {
  const key = createHmac("sha256", sessionSecretKey()).update(`${rule.scope}:${rule.key}`).digest("hex");
  try {
    const result = await query<{ attempts: number; retry_after: number }>(
      `INSERT INTO security_rate_limits (key, attempts, expires_at)
       VALUES ($1, 1, NOW() + $2 * INTERVAL '1 second')
       ON CONFLICT (key) DO UPDATE SET
         attempts = CASE WHEN security_rate_limits.expires_at <= NOW() THEN 1 ELSE security_rate_limits.attempts + 1 END,
         expires_at = CASE WHEN security_rate_limits.expires_at <= NOW() THEN NOW() + $2 * INTERVAL '1 second' ELSE security_rate_limits.expires_at END
       RETURNING attempts, GREATEST(1, CEIL(EXTRACT(EPOCH FROM expires_at - NOW())))::int AS retry_after`,
      [key, rule.windowSeconds]
    );
    const row = result.rows[0];
    if (row.attempts <= rule.limit) return null;
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, {
      status: 429, headers: { "Retry-After": String(row.retry_after), "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Security rate limiter unavailable", error instanceof Error ? error.name : "Error");
    return NextResponse.json({ error: "This service is temporarily unavailable. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function limitRequest(request: Request, scope: string, limit: number, windowSeconds: number) {
  return enforceRateLimit({ scope, key: requestClientKey(request), limit, windowSeconds });
}
