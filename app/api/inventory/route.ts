import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createProduct, listProducts } from "@/lib/data";
import { productSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "inventory:read");
  if (!auth.user) return fail(auth.error, auth.status);
  return ok({ products: await listProducts(request.nextUrl.searchParams.get("q") || undefined) });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid product data", 422, parsed.error.flatten());
  return ok({ product: await createProduct(parsed.data, auth.user.id) }, { status: 201 });
}
