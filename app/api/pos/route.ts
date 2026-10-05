import {z} from "zod";
import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createOrder, getBusinessSettings, listCategories, listCustomers, listProducts } from "@/lib/data";
import { checkoutSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "pos:sell");
  if (!auth.user) return fail(auth.error, auth.status);
  return ok({
    products: await listProducts(request.nextUrl.searchParams.get("q") || undefined, false, auth.user.business_id),
    customers: await listCustomers(undefined, auth.user.business_id),
    categories: await listCategories(undefined, false, auth.user.business_id),
    settings:await getBusinessSettings(auth.user.business_id)
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "pos:sell");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid checkout data", 422, parsed.error.flatten());
  try {
    const key=z.string().uuid().safeParse(request.headers.get("Idempotency-Key"));
    if(!key.success)return fail("Checkout request key is required. Refresh POS and try again.",422);
    const order = await createOrder({ ...parsed.data, idempotency_key:key.data, business_id: auth.user.business_id }, auth.user.id);
    return ok({ order }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Checkout failed", 400);
  }
}
