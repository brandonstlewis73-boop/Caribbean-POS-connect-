import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createStaffUser, listUsers } from "@/lib/data";
import { staffUserSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "staff:manage");
  if (!auth.user) return fail(auth.error, auth.status);
  return ok({ staff: await listUsers(undefined, true, auth.user.business_id) });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, "staff:manage");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = staffUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid staff profile", 422, parsed.error.flatten());
  try {
    const staff = await createStaffUser(parsed.data, auth.user.id);
    return staff ? ok({ staff }, { status: 201 }) : fail("Staff profile could not be saved.", 400);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Staff profile could not be saved.", 500);
  }
}
