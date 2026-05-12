import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getSessionUserFromRequest, requireUser } from "@/lib/auth";
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
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid order data", 422, parsed.error.flatten());

  const user = await getSessionUserFromRequest(request);
  const isCustomerFacing = ["online", "delivery", "pickup"].includes(parsed.data.order_type);
  if (!user && !isCustomerFacing) return fail("Authentication required", 401);

  try {
    const orderInput = user
      ? parsed.data
      : {
          ...parsed.data,
          assigned_driver_id: undefined,
          created_by: undefined,
          status: "new" as const,
          payment_status: "unpaid" as const,
          discount_amount: 0,
          service_fee: undefined,
          delivery_fee: undefined
        };
    const order = await createOrder({ ...orderInput, business_id: user?.business_id || null }, user?.id);
    return ok({ order }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Order failed", 400);
  }
}
