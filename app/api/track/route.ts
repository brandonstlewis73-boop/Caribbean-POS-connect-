import { limitRequest } from "@/lib/rate-limit";
import { readBoundedJson } from "@/lib/request-security";
import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getPublicOrderTracking } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = await limitRequest(request, "tracking", 30, 900);
  if (limited) return limited;
  const order = request.nextUrl.searchParams.get("order") || "";
  const phone = request.nextUrl.searchParams.get("phone") || "";
  const tracking = await getPublicOrderTracking(order, phone);
  return tracking ? ok(tracking) : fail("Order not found. Check the order number and phone number.", 404);
}

export async function POST(request: NextRequest) {
  const limited = await limitRequest(request, "tracking", 30, 900);
  if (limited) return limited;
  const body = await readBoundedJson(request) as { order_number?: string; phone?: string } | null;
  const tracking = await getPublicOrderTracking(body?.order_number || "", body?.phone || "");
  return tracking ? ok(tracking) : fail("Order not found. Check the order number and phone number.", 404);
}
