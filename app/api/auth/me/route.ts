import { NextRequest } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getSessionUserFromRequest(request);
  if (!user) return fail("Authentication required", 401);
  return ok({ user });
}
