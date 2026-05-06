import { NextRequest } from "next/server";
import { fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOrder } from "@/lib/data";
import { createShippingLabelPdfBuffer } from "@/lib/receipt";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "orders:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return fail("Order not found", 404);
  if (auth.user.role === "driver" && order.assigned_driver_id !== auth.user.id) {
    return fail("Order not found", 404);
  }

  const buffer = await createShippingLabelPdfBuffer(order);
  const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="shipping-label-${order.order_number}.pdf"`
    }
  });
}
