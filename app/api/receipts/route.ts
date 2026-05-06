import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listOrders } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "orders:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const orders = await listOrders({ limit: 50 });
  return ok({
    receipts: orders.map((order) => ({
      order_id: order.id,
      order_number: order.order_number,
      customer: order.customer_snapshot.name,
      total: order.total,
      payment_method: order.payment_method,
      created_at: order.created_at,
      pdf_url: `/api/orders/${order.id}/receipt`
    }))
  });
}
