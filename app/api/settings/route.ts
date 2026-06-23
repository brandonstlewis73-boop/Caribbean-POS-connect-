import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getBusinessSettings, listBusinesses, listUsers, updateSettings } from "@/lib/data";
import { settingsSchema } from "@/lib/validators";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, "dashboard:read");
  if (!auth.user) return fail(auth.error, auth.status);
  return ok({
    settings: await getBusinessSettings(auth.user.business_id),
    staff: ["admin", "manager", "owner"].includes(auth.user.role) ? await listUsers(undefined, true, auth.user.business_id) : []
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUser(request, "settings:write");
  if (!auth.user) return fail(auth.error, auth.status);
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid settings payload", 422, parsed.error.flatten());
  const settings = await updateSettings(parsed.data as Partial<Settings>, auth.user.id);
  const businesses = await listBusinesses(auth.user.id);
  return ok({ settings, businesses });
}
