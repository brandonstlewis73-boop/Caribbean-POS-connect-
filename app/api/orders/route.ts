import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createOrder, listOrders } from "@/lib/data";
import { checkoutSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "orders:read");
  if (!auth.user) return fail(auth.error, auth.status);
  return ok({
    orders: await listOrders({
      query: request.nextUrl.searchParams.get("q") || undefined,
      type: request.nextUrl.searchParams.get("type") || undefined,
      status: request.nextUrl.searchParams.get("status") || undefined,
      driverId: auth.user.role === "driver" ? auth.user.id : undefined,
      businessId: auth.user.business_id
    })
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "pos:sell");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid order data", 422, parsed.error.flatten());

  try {
    const order = await createOrder({ ...parsed.data, business_id: auth.user.business_id }, auth.user.id);
    return ok({ order }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Order failed", 400);
  }
}
