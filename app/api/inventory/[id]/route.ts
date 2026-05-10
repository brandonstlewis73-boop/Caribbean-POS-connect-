import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { adjustStock, deleteProduct, getProduct, updateProduct } from "@/lib/data";
import { productSchema } from "@/lib/validators";

export const runtime = "nodejs";

function productSaveError(error: unknown) {
  const code = typeof error === "object" && error ? (error as { code?: string }).code : undefined;
  const message = error instanceof Error ? error.message : "";
  if (code === "23505" || message.includes("products_sku") || message.includes("sku")) {
    return "A product with this SKU already exists. Use a different SKU.";
  }
  if (code === "23503" || message.includes("products_category") || message.includes("category")) {
    return "That product category is not set up in the database. Choose another category and try again.";
  }
  return message || "Product could not be updated.";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const product = await getProduct(id);
    if (!product) return fail("Product not found", 404);
    return ok({ product });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Product could not be loaded.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.adjustment_delta === "number") {
    try {
      const product = await adjustStock(id, body.adjustment_delta, body.reason || "Manual adjustment", auth.user.id);
      return product ? ok({ product }) : fail("Product not found", 404);
    } catch (error) {
      return fail(productSaveError(error), 500);
    }
  }
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) return fail("Invalid product update", 422, parsed.error.flatten());
  try {
    const product = await updateProduct(id, parsed.data, auth.user.id);
    return product ? ok({ product }) : fail("Product not found", 404);
  } catch (error) {
    return fail(productSaveError(error), 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const { id } = await params;
  try {
    const product = await deleteProduct(id, auth.user.id);
    return product ? ok({ product }) : fail("Product not found", 404);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Product could not be deleted.", 500);
  }
}
