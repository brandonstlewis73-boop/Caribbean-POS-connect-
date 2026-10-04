import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { assertFeatureAccess, PlanGateError } from "@/lib/data";
import { saveAiProductDescription, AiProductActionError } from "@/lib/ai-product-actions";
export const runtime = "nodejs";
const schema = z.object({ productId: z.string().trim().min(1).max(128),
  description: z.string().trim().min(1).max(4000),
  expectedDescription: z.string().max(10000).nullable() }).strict();
export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "inventory:write");
  if (!auth.user) return fail(auth.error, auth.status);
  if (!auth.user.business_id) return fail("Business account is required.", 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid product description.", 422);
  try {
    await assertFeatureAccess(auth.user.business_id, "aiSupport");
    const product = await saveAiProductDescription(auth.user, parsed.data);
    return ok({ product, saved: true });
  } catch (error) {
    if (error instanceof AiProductActionError) return fail(error.message, error.status);
    if (error instanceof PlanGateError) return fail(error.message, error.status, error.details);
    return fail("The product description could not be saved. Try again.", 500);
  }
}
