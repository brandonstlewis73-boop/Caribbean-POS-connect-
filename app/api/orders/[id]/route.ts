import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteOrder, getOrder, updateOrder } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "orders:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const order = await getOrder(id, auth.user.business_id);
  if (order && auth.user.role === "driver" && order.assigned_driver_id !== auth.user.id) {
    return fail("Order not found", 404);
  }
  return order ? ok({ order }) : fail("Order not found", 404);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "orders:update");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const order = await updateOrder(id, body || {}, auth.user.id);
  return order ? ok({ order }) : fail("Order not found", 404);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "orders:update");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const order = await deleteOrder(id, auth.user.id);
  return order ? ok({ order }) : fail("Order not found", 404);
}
