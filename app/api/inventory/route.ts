import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createProduct, listProducts } from "@/lib/data";
import { productSchema } from "@/lib/validators";

export const runtime = "nodejs";

function autoSku(name: string) {
  const prefix = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18) || "PRODUCT";
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function prepareProductBody(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const next = { ...(body as Record<string, unknown>) };
  if (typeof next.name === "string" && typeof next.sku === "string" && !next.sku.trim()) {
    next.sku = autoSku(next.name);
  }
  if (typeof next.name === "string" && next.sku === undefined) {
    next.sku = autoSku(next.name);
  }
  return next;
}

function productSaveError(error: unknown) {
  const code = typeof error === "object" && error ? (error as { code?: string }).code : undefined;
  const message = error instanceof Error ? error.message : "";
  if (code === "23505" || message.includes("products_sku") || message.includes("sku")) {
    return "A product with this SKU already exists. Change the SKU or leave it blank for an automatic one.";
  }
  if (code === "23503" || message.includes("products_category") || message.includes("category")) {
    return "That product category is not set up in the database. Choose another category and try again.";
  }
  return message || "Product could not be saved.";
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "inventory:read");
  if (!auth.user) return fail(auth.error, auth.status);
  try {
    return ok({ products: await listProducts(request.nextUrl.searchParams.get("q") || undefined) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Products could not be loaded.", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = productSchema.safeParse(prepareProductBody(await request.json().catch(() => null)));
  if (!parsed.success) return fail("Invalid product data", 422, parsed.error.flatten());
  try {
    const product = await createProduct(parsed.data, auth.user.id);
    return ok({ product }, { status: 201 });
  } catch (error) {
    return fail(productSaveError(error), 500);
  }
}
