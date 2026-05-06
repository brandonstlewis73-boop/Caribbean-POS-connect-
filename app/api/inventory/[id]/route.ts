import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { adjustStock, getProduct, updateProduct } from "@/lib/data";
import { productSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return fail("Product not found", 404);
  return ok({ product });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.adjustment_delta === "number") {
    const product = await adjustStock(id, body.adjustment_delta, body.reason || "Manual adjustment", auth.user.id);
    return product ? ok({ product }) : fail("Product not found", 404);
  }
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) return fail("Invalid product update", 422, parsed.error.flatten());
  const product = await updateProduct(id, parsed.data, auth.user.id);
  return product ? ok({ product }) : fail("Product not found", 404);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const product = await updateProduct(id, { active: false }, auth.user.id);
  return product ? ok({ product }) : fail("Product not found", 404);
}
