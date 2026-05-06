import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOrder, updateDeliveryStatus } from "@/lib/data";

export const runtime = "nodejs";

const statusSchema = z.object({
  status: z.enum(["pending", "assigned", "out_for_delivery", "delivered", "failed"])
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "deliveries:read_assigned");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid delivery status", 422, parsed.error.flatten());
  const { id } = await params;
  const existing = await getOrder(id);
  if (!existing || existing.order_type !== "delivery") return fail("Delivery not found", 404);
  if (auth.user.role === "driver" && existing.assigned_driver_id !== auth.user.id) {
    return fail("Delivery not found", 404);
  }
  const order = await updateDeliveryStatus(id, parsed.data.status, auth.user.id);
  return order ? ok({ order }) : fail("Delivery not found", 404);
}
