import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { PlanGateError, assertFeatureAccess, assertUsageLimit, createBusiness, listBusinesses } from "@/lib/data";
import { businessSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);
  return ok({ businesses: await listBusinesses(auth.user.id) });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = businessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid business data", 422, parsed.error.flatten());
  try {
    await assertFeatureAccess(auth.user.business_id, "multiLocation");
    await assertUsageLimit(auth.user.business_id, "locations", 1);
    const business = await createBusiness(parsed.data, auth.user.id);
    return business ? ok({ business }, { status: 201 }) : fail("Business name is required", 422);
  } catch (error) {
    if (error instanceof PlanGateError) return fail(error.message, error.status, error.details);
    return fail(error instanceof Error ? error.message : "Business could not be saved.", 500);
  }
}
