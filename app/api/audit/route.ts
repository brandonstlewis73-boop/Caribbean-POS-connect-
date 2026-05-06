import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listAuditLogs } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "audit:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const limit = Number(request.nextUrl.searchParams.get("limit") || 100);
  return ok({ audit_logs: await listAuditLogs(limit) });
}
