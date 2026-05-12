import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createBusiness, listBusinesses } from "@/lib/data";
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
  const business = await createBusiness(parsed.data, auth.user.id);
  return business ? ok({ business }, { status: 201 }) : fail("Business name is required", 422);
}
