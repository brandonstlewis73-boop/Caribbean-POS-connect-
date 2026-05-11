import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listReceipts, resendReceiptWhatsApp } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "orders:read");
  if (!auth.user) return fail(auth.error, auth.status);
  return ok({
    receipts: await listReceipts({
      query: request.nextUrl.searchParams.get("q") || undefined,
      limit: Number(request.nextUrl.searchParams.get("limit") || 100)
    })
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "orders:update");
  if (!auth.user) return fail(auth.error, auth.status);
  const body = await request.json().catch(() => null);
  if (body?.action !== "resend_whatsapp" || !body?.receipt_id) {
    return fail("Receipt action and receipt_id are required.", 422);
  }
  const result = await resendReceiptWhatsApp(String(body.receipt_id), auth.user.id);
  return result ? ok(result) : fail("Receipt not found", 404);
}
