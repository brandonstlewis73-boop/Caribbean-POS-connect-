import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { getBusinessSettings, listProducts, assertFeatureAccess, PlanGateError } from "@/lib/data";
import { hasPermission } from "@/lib/permissions";
import type { AiWorkspaceResources } from "@/lib/ai-workspace-types";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "support:read");
  if (!auth.user) return fail(auth.error, auth.status);
  const user = auth.user;
  if (!user.business_id) return fail("Business account is required.", 403);
  try {
    await assertFeatureAccess(user.business_id, "aiSupport");
    const [settings, products] = await Promise.all([
      getBusinessSettings(user.business_id),
      hasPermission(user.role, "inventory:read") ? listProducts(undefined, true, user.business_id) : Promise.resolve([])
    ]);
    const resources: AiWorkspaceResources = {
      currency: settings.currency,
      canSaveProducts: hasPermission(user.role, "inventory:write"),
      products: products.map(product => ({ id: product.id, name: product.name,
        category: product.category, description: product.description ?? null,
        sellingPrice: product.selling_price, stock: product.stock_quantity }))
    };
    return ok(resources);
  } catch (error) {
    if (error instanceof PlanGateError) return fail(error.message, error.status, error.details);
    return fail("Business records could not be loaded. Try again.", 500);
  }
}
