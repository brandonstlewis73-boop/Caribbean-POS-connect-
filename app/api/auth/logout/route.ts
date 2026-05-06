import { NextResponse } from "next/server";
import { expiredSessionCookieOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(expiredSessionCookieOptions());
  return response;
}
